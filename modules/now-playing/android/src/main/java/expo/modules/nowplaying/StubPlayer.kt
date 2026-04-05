package expo.modules.nowplaying

import android.content.Context
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.DeviceInfo
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.common.Tracks
import androidx.media3.common.VideoSize
import androidx.media3.common.text.CueGroup
import androidx.media3.common.util.Size
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer

/**
 * A [ForwardingPlayer]-style wrapper around a silent [ExoPlayer].
 *
 * We create a real ExoPlayer (which satisfies the full Player contract)
 * but never give it media. We override state getters to return our
 * own values so the MediaSession/notification shows the right info.
 */
@UnstableApi
class StubPlayer(context: Context) : Player {
  private val delegate: ExoPlayer = ExoPlayer.Builder(context).build()

  var isPlayingState = false
  var positionMs: Long = 0L
  var durationMs: Long = 0L
  var playbackRate: Float = 1f
  private var _mediaMetadata: MediaMetadata = MediaMetadata.EMPTY

  fun setMediaMetadata(metadata: MediaMetadata) { _mediaMetadata = metadata }

  fun notifyIsPlayingChanged() {
    // ExoPlayer's listeners are attached to delegate, so we fire manually
    // by toggling playWhenReady which the session observes
    delegate.playWhenReady = isPlayingState
  }

  // -- Overridden state getters --

  override fun isPlaying(): Boolean = isPlayingState
  override fun getPlaybackState(): Int = Player.STATE_READY
  override fun getCurrentPosition(): Long = positionMs
  override fun getDuration(): Long = durationMs
  override fun getContentPosition(): Long = positionMs
  override fun getContentDuration(): Long = durationMs
  override fun getBufferedPosition(): Long = durationMs
  override fun getBufferedPercentage(): Int = 100
  override fun getContentBufferedPosition(): Long = durationMs
  override fun getTotalBufferedDuration(): Long = durationMs - positionMs
  override fun getPlaybackParameters(): PlaybackParameters = PlaybackParameters(playbackRate)
  override fun getMediaMetadata(): MediaMetadata = _mediaMetadata
  override fun getPlaylistMetadata(): MediaMetadata = _mediaMetadata
  override fun getPlayWhenReady(): Boolean = isPlayingState
  override fun isLoading(): Boolean = false
  override fun isCurrentMediaItemSeekable(): Boolean = true

  // -- Delegate everything else to the real ExoPlayer --

  override fun getApplicationLooper(): Looper = delegate.applicationLooper
  override fun addListener(listener: Player.Listener) = delegate.addListener(listener)
  override fun removeListener(listener: Player.Listener) = delegate.removeListener(listener)
  override fun getAvailableCommands(): Player.Commands = Player.Commands.Builder()
    .add(Player.COMMAND_PLAY_PAUSE)
    .add(Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM)
    .add(Player.COMMAND_GET_CURRENT_MEDIA_ITEM)
    .add(Player.COMMAND_GET_METADATA)
    .add(Player.COMMAND_GET_TIMELINE)
    .build()
  override fun isCommandAvailable(command: Int): Boolean = availableCommands.contains(command)
  override fun canAdvertiseSession(): Boolean = true

  override fun play() { /* handled by session callback */ }
  override fun pause() { /* handled by session callback */ }
  override fun prepare() = delegate.prepare()
  override fun stop() = delegate.stop()
  override fun release() = delegate.release()
  override fun seekTo(positionMs: Long) { /* handled by session callback */ }
  override fun seekTo(mediaItemIndex: Int, positionMs: Long) {}

  override fun setPlayWhenReady(playWhenReady: Boolean) { delegate.playWhenReady = playWhenReady }
  override fun getRepeatMode(): Int = delegate.repeatMode
  override fun setRepeatMode(repeatMode: Int) { delegate.repeatMode = repeatMode }
  override fun getShuffleModeEnabled(): Boolean = delegate.shuffleModeEnabled
  override fun setShuffleModeEnabled(shuffleModeEnabled: Boolean) { delegate.shuffleModeEnabled = shuffleModeEnabled }

  override fun getCurrentTimeline(): Timeline = delegate.currentTimeline
  override fun getCurrentMediaItemIndex(): Int = delegate.currentMediaItemIndex
  override fun getCurrentMediaItem(): MediaItem? = delegate.currentMediaItem
  override fun getMediaItemCount(): Int = delegate.mediaItemCount
  override fun getMediaItemAt(index: Int): MediaItem = delegate.getMediaItemAt(index)
  override fun getCurrentPeriodIndex(): Int = delegate.currentPeriodIndex
  override fun getCurrentTracks(): Tracks = delegate.currentTracks
  override fun getTrackSelectionParameters(): TrackSelectionParameters = delegate.trackSelectionParameters
  override fun setTrackSelectionParameters(parameters: TrackSelectionParameters) { delegate.trackSelectionParameters = parameters }
  override fun getAudioAttributes(): AudioAttributes = delegate.audioAttributes
  override fun setAudioAttributes(audioAttributes: AudioAttributes, handleAudioFocus: Boolean) {}
  override fun getVolume(): Float = delegate.volume
  override fun setVolume(volume: Float) { delegate.volume = volume }
  override fun getDeviceInfo(): DeviceInfo = delegate.deviceInfo
  override fun getDeviceVolume(): Int = delegate.deviceVolume
  override fun isDeviceMuted(): Boolean = delegate.isDeviceMuted
  override fun setDeviceVolume(volume: Int, flags: Int) {}
  override fun setDeviceMuted(muted: Boolean, flags: Int) {}
  override fun increaseDeviceVolume(flags: Int) {}
  override fun decreaseDeviceVolume(flags: Int) {}
  override fun getSurfaceSize(): Size = delegate.surfaceSize
  override fun getVideoSize(): VideoSize = delegate.videoSize
  override fun getCurrentCues(): CueGroup = delegate.currentCues
  override fun getPlayerError(): PlaybackException? = delegate.playerError
  override fun getNextMediaItemIndex(): Int = delegate.nextMediaItemIndex
  override fun getPreviousMediaItemIndex(): Int = delegate.previousMediaItemIndex
  override fun hasPreviousMediaItem(): Boolean = delegate.hasPreviousMediaItem()
  override fun hasNextMediaItem(): Boolean = delegate.hasNextMediaItem()
  override fun isCurrentMediaItemDynamic(): Boolean = delegate.isCurrentMediaItemDynamic
  override fun isCurrentMediaItemLive(): Boolean = delegate.isCurrentMediaItemLive
  override fun isPlayingAd(): Boolean = delegate.isPlayingAd
  override fun getCurrentAdGroupIndex(): Int = delegate.currentAdGroupIndex
  override fun getCurrentAdIndexInAdGroup(): Int = delegate.currentAdIndexInAdGroup
  override fun getMaxSeekToPreviousPosition(): Long = delegate.maxSeekToPreviousPosition
  override fun getPlaybackSuppressionReason(): Int = delegate.playbackSuppressionReason
  override fun getSeekBackIncrement(): Long = NowPlayingService.SEEK_INTERVAL_MS
  override fun getSeekForwardIncrement(): Long = NowPlayingService.SEEK_INTERVAL_MS

  override fun setPlaylistMetadata(mediaMetadata: MediaMetadata) {}
  override fun setMediaItem(mediaItem: MediaItem) {}
  override fun setMediaItem(mediaItem: MediaItem, startPositionMs: Long) {}
  override fun setMediaItem(mediaItem: MediaItem, resetPosition: Boolean) {}
  override fun setMediaItems(mediaItems: MutableList<MediaItem>) {}
  override fun setMediaItems(mediaItems: MutableList<MediaItem>, resetPosition: Boolean) {}
  override fun setMediaItems(mediaItems: MutableList<MediaItem>, startIndex: Int, startPositionMs: Long) {}
  override fun addMediaItem(mediaItem: MediaItem) {}
  override fun addMediaItem(index: Int, mediaItem: MediaItem) {}
  override fun addMediaItems(mediaItems: MutableList<MediaItem>) {}
  override fun addMediaItems(index: Int, mediaItems: MutableList<MediaItem>) {}
  override fun moveMediaItem(currentIndex: Int, newIndex: Int) {}
  override fun moveMediaItems(fromIndex: Int, toIndex: Int, newIndex: Int) {}
  override fun replaceMediaItem(index: Int, mediaItem: MediaItem) {}
  override fun replaceMediaItems(fromIndex: Int, toIndex: Int, mediaItems: MutableList<MediaItem>) {}
  override fun removeMediaItem(index: Int) {}
  override fun removeMediaItems(fromIndex: Int, toIndex: Int) {}
  override fun clearMediaItems() {}
  override fun setPlaybackParameters(playbackParameters: PlaybackParameters) {}
  override fun setPlaybackSpeed(speed: Float) {}
  override fun setVideoSurface(surface: android.view.Surface?) {}
  override fun setVideoSurfaceHolder(surfaceHolder: android.view.SurfaceHolder?) {}
  override fun setVideoSurfaceView(surfaceView: android.view.SurfaceView?) {}
  override fun setVideoTextureView(textureView: android.view.TextureView?) {}
  override fun clearVideoSurface() {}
  override fun clearVideoSurface(surface: android.view.Surface?) {}
  override fun clearVideoSurfaceHolder(surfaceHolder: android.view.SurfaceHolder?) {}
  override fun clearVideoSurfaceView(surfaceView: android.view.SurfaceView?) {}
  override fun clearVideoTextureView(textureView: android.view.TextureView?) {}
  override fun seekToDefaultPosition() {}
  override fun seekToDefaultPosition(mediaItemIndex: Int) {}
  override fun seekBack() {}
  override fun seekForward() {}
  override fun seekToNext() {}
  override fun seekToPrevious() {}
  override fun seekToNextMediaItem() {}
  override fun seekToPreviousMediaItem() {}

  // -- Deprecated / legacy methods still required by Player interface --

  @Suppress("DEPRECATION")
  override fun setDeviceVolume(volume: Int) {}
  @Suppress("DEPRECATION")
  override fun setDeviceMuted(muted: Boolean) {}
  @Suppress("DEPRECATION")
  override fun increaseDeviceVolume() {}
  @Suppress("DEPRECATION")
  override fun decreaseDeviceVolume() {}
  @Suppress("DEPRECATION")
  override fun getCurrentManifest(): Any? = null
  @Suppress("DEPRECATION")
  override fun getCurrentWindowIndex(): Int = 0
  @Suppress("DEPRECATION")
  override fun getNextWindowIndex(): Int = -1
  @Suppress("DEPRECATION")
  override fun getPreviousWindowIndex(): Int = -1
  @Suppress("DEPRECATION")
  override fun isCurrentWindowDynamic(): Boolean = false
  @Suppress("DEPRECATION")
  override fun isCurrentWindowLive(): Boolean = false
  @Suppress("DEPRECATION")
  override fun getCurrentLiveOffset(): Long = 0
  @Suppress("DEPRECATION")
  override fun isCurrentWindowSeekable(): Boolean = true
}
