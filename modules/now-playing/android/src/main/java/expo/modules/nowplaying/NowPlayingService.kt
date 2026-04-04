package expo.modules.nowplaying

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Binder
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.annotation.OptIn
import androidx.core.app.NotificationCompat
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.MediaStyleNotificationHelper
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.net.URL

@OptIn(UnstableApi::class)
class NowPlayingService : MediaSessionService() {
  private val binder = LocalBinder()
  private var mediaSession: MediaSession? = null
  private var stubPlayer: StubPlayer? = null
  private val scope = CoroutineScope(Dispatchers.IO)
  private var artworkJob: Job? = null
  private var currentArtworkUrl: URL? = null
  private var currentArtwork: Bitmap? = null

  var commandCallback: ((command: String, positionMs: Double?) -> Unit)? = null

  private var currentMetadata: NowPlayingMetadata? = null
  private var currentState: NowPlayingPlaybackState? = null
  private var currentButtons: NowPlayingButtons? = null

  inner class LocalBinder : Binder() {
    val service: NowPlayingService get() = this@NowPlayingService
  }

  override fun onBind(intent: Intent?): IBinder {
    super.onBind(intent)
    return binder
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
    return mediaSession
  }

  override fun onUpdateNotification(session: MediaSession, startInForegroundRequired: Boolean) {
    postNotification(startInForeground = startInForegroundRequired)
  }

  fun updateMetadata(metadata: NowPlayingMetadata) {
    currentMetadata = metadata
    stubPlayer?.let { player ->
      player.mediaMetadata = MediaMetadata.Builder()
        .setTitle(metadata.title)
        .setArtist(metadata.artist)
        .setAlbumTitle(metadata.albumTitle)
        .build()
      metadata.durationMs?.let { player.durationMs = it.toLong() }
    }
    loadArtwork(metadata.artworkUrl)
    postNotification(startInForeground = false)
  }

  fun updatePlaybackState(state: NowPlayingPlaybackState) {
    currentState = state
    stubPlayer?.let { player ->
      val wasPlaying = player.isPlayingState
      player.isPlayingState = state.playing
      state.positionMs?.let { player.positionMs = it.toLong() }
      state.playbackRate?.let { player.playbackRate = it.toFloat() }

      if (wasPlaying != state.playing) {
        player.notifyIsPlayingChanged()
      }
    }
    updateCustomLayout(state.playing)
    postNotification(startInForeground = false)
  }

  fun setButtons(buttons: NowPlayingButtons) {
    currentButtons = buttons
    updateCustomLayout(currentState?.playing ?: false)
    postNotification(startInForeground = false)
  }

  fun show() {
    if (stubPlayer == null) {
      stubPlayer = StubPlayer(this)
    }

    val player = stubPlayer!!
    mediaSession?.release()

    val session = MediaSession.Builder(this, player)
      .setCallback(createSessionCallback())
      .build()
    addSession(session)
    mediaSession = session

    // Apply any buffered state
    currentMetadata?.let { updateMetadata(it) }
    currentState?.let { updatePlaybackState(it) }
    currentButtons?.let { setButtons(it) }

    postNotification(startInForeground = true)
  }

  fun hide() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.cancel(NOTIFICATION_ID)
    mediaSession?.release()
    mediaSession = null
    stubPlayer = null
    commandCallback = null
  }

  // -- Notification --

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        nm.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Now Playing", NotificationManager.IMPORTANCE_LOW)
        )
      }
    }
  }

  private fun postNotification(startInForeground: Boolean) {
    val notification = buildNotification() ?: return
    if (startInForeground) {
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
          startForeground(NOTIFICATION_ID, notification)
        }
      } catch (_: Exception) {}
    } else {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.notify(NOTIFICATION_ID, notification)
    }
  }

  private fun buildNotification(): Notification? {
    val session = mediaSession ?: return null
    val meta = currentMetadata

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(androidx.media3.session.R.drawable.media3_icon_circular_play)
      .setContentTitle(meta?.title ?: "\u200E")
      .setContentText(meta?.artist)
      .setSubText(meta?.albumTitle)
      .setLargeIcon(currentArtwork)
      .setContentIntent(buildContentIntent())
      .setAutoCancel(false)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setStyle(MediaStyleNotificationHelper.MediaStyle(session))

    return builder.build()
  }

  private fun buildContentIntent(): PendingIntent? {
    val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(this, 0, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  // -- Custom layout (buttons) --

  private fun updateCustomLayout(isPlaying: Boolean) {
    val session = mediaSession ?: return
    val buttons = currentButtons
    val layout = mutableListOf<CommandButton>()

    if (buttons?.skipPrevious == true) {
      layout.add(
        CommandButton.Builder(CommandButton.ICON_PREVIOUS)
          .setDisplayName("Previous")
          .setEnabled(true)
          .setSessionCommand(SessionCommand(ACTION_SKIP_PREVIOUS, Bundle.EMPTY))
          .build()
      )
    }

    if (buttons?.seekBackward == true) {
      layout.add(
        CommandButton.Builder(CommandButton.ICON_SKIP_BACK)
          .setDisplayName("Seek Backward")
          .setEnabled(true)
          .setSessionCommand(SessionCommand(ACTION_SEEK_BACKWARD, Bundle.EMPTY))
          .build()
      )
    }

    layout.add(
      CommandButton.Builder(if (isPlaying) CommandButton.ICON_PAUSE else CommandButton.ICON_PLAY)
        .setDisplayName(if (isPlaying) "Pause" else "Play")
        .setEnabled(true)
        .setPlayerCommand(Player.COMMAND_PLAY_PAUSE)
        .build()
    )

    if (buttons?.seekForward == true) {
      layout.add(
        CommandButton.Builder(CommandButton.ICON_SKIP_FORWARD)
          .setDisplayName("Seek Forward")
          .setEnabled(true)
          .setSessionCommand(SessionCommand(ACTION_SEEK_FORWARD, Bundle.EMPTY))
          .build()
      )
    }

    if (buttons?.skipNext == true) {
      layout.add(
        CommandButton.Builder(CommandButton.ICON_NEXT)
          .setDisplayName("Next")
          .setEnabled(true)
          .setSessionCommand(SessionCommand(ACTION_SKIP_NEXT, Bundle.EMPTY))
          .build()
      )
    }

    session.setCustomLayout(layout)
  }

  // -- Session callback --

  private fun createSessionCallback() = object : MediaSession.Callback {
    override fun onConnect(
      session: MediaSession,
      controller: MediaSession.ControllerInfo
    ): MediaSession.ConnectionResult {
      return MediaSession.ConnectionResult.AcceptedResultBuilder(session)
        .setAvailablePlayerCommands(
          MediaSession.ConnectionResult.DEFAULT_PLAYER_COMMANDS.buildUpon()
            .add(Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM)
            .remove(Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)
            .remove(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
            .remove(Player.COMMAND_SEEK_TO_PREVIOUS)
            .remove(Player.COMMAND_SEEK_TO_NEXT)
            .build()
        )
        .setAvailableSessionCommands(
          MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
            .add(SessionCommand(ACTION_SKIP_NEXT, Bundle.EMPTY))
            .add(SessionCommand(ACTION_SKIP_PREVIOUS, Bundle.EMPTY))
            .add(SessionCommand(ACTION_SEEK_FORWARD, Bundle.EMPTY))
            .add(SessionCommand(ACTION_SEEK_BACKWARD, Bundle.EMPTY))
            .build()
        )
        .build()
    }

    override fun onCustomCommand(
      session: MediaSession,
      controller: MediaSession.ControllerInfo,
      command: SessionCommand,
      args: Bundle
    ): ListenableFuture<SessionResult> {
      when (command.customAction) {
        ACTION_SKIP_NEXT -> commandCallback?.invoke("skipNext", null)
        ACTION_SKIP_PREVIOUS -> commandCallback?.invoke("skipPrevious", null)
        ACTION_SEEK_FORWARD -> commandCallback?.invoke("seekForward", null)
        ACTION_SEEK_BACKWARD -> commandCallback?.invoke("seekBackward", null)
      }
      return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
    }

    override fun onPlayerCommandRequest(
      session: MediaSession,
      controller: MediaSession.ControllerInfo,
      playerCommand: Int
    ): Int {
      if (playerCommand == Player.COMMAND_PLAY_PAUSE) {
        val isPlaying = currentState?.playing ?: false
        commandCallback?.invoke(if (isPlaying) "pause" else "play", null)
        return SessionResult.RESULT_SUCCESS
      }
      if (playerCommand == Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM) {
        return SessionResult.RESULT_SUCCESS
      }
      return super.onPlayerCommandRequest(session, controller, playerCommand)
    }
  }

  // -- Artwork --

  private fun loadArtwork(url: URL?) {
    if (url == currentArtworkUrl) return
    currentArtworkUrl = url
    if (url == null) {
      artworkJob?.cancel()
      currentArtwork = null
      postNotification(startInForeground = false)
      return
    }
    artworkJob?.cancel()
    artworkJob = scope.launch {
      try {
        val input = url.openConnection().getInputStream()
        val bitmap = BitmapFactory.decodeStream(input)
        if (isActive) {
          currentArtwork = bitmap
          postNotification(startInForeground = false)
        }
      } catch (_: Exception) {}
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    artworkJob?.cancel()
    scope.cancel()
    mediaSession?.release()
    mediaSession = null
    stubPlayer = null
  }

  companion object {
    const val CHANNEL_ID = "now_playing"
    const val NOTIFICATION_ID = 4242
    const val ACTION_SKIP_NEXT = "expo.modules.nowplaying.SKIP_NEXT"
    const val ACTION_SKIP_PREVIOUS = "expo.modules.nowplaying.SKIP_PREVIOUS"
    const val ACTION_SEEK_FORWARD = "expo.modules.nowplaying.SEEK_FORWARD"
    const val ACTION_SEEK_BACKWARD = "expo.modules.nowplaying.SEEK_BACKWARD"
    const val SEEK_INTERVAL_MS = 10000L
  }
}
