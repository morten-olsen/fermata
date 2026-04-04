package expo.modules.nowplaying

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import expo.modules.kotlin.AppContext

/**
 * Manages the connection to [NowPlayingService] and forwards calls from JS.
 */
class NowPlayingServiceManager(
  private val context: Context,
  private val appContext: AppContext
) {
  private var service: NowPlayingService? = null
  private var isBound = false
  private var commandCallback: ((String, Double?) -> Unit)? = null

  // Buffered state so we can apply it once the service connects
  private var pendingMetadata: NowPlayingMetadata? = null
  private var pendingState: NowPlayingPlaybackState? = null
  private var pendingButtons: NowPlayingButtons? = null
  private var pendingShow = false

  private val connection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
      val nowPlayingBinder = binder as? NowPlayingService.LocalBinder ?: return
      service = nowPlayingBinder.service
      isBound = true
      applyPending()
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      service = null
      isBound = false
    }
  }

  fun updateMetadata(metadata: NowPlayingMetadata) {
    pendingMetadata = metadata
    service?.updateMetadata(metadata) ?: ensureBound()
  }

  fun updatePlaybackState(state: NowPlayingPlaybackState) {
    pendingState = state
    service?.updatePlaybackState(state) ?: ensureBound()
  }

  fun setButtons(buttons: NowPlayingButtons) {
    pendingButtons = buttons
    service?.setButtons(buttons) ?: ensureBound()
  }

  fun show(callback: (String, Double?) -> Unit) {
    commandCallback = callback
    pendingShow = true
    if (service != null) {
      service!!.commandCallback = callback
      service!!.show()
    } else {
      ensureBound()
    }
  }

  fun hide() {
    pendingShow = false
    service?.hide()
    if (isBound) {
      try { context.unbindService(connection) } catch (_: Exception) {}
      isBound = false
    }
    service = null
  }

  private fun ensureBound() {
    if (isBound) return
    val intent = Intent(context, NowPlayingService::class.java)
    context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
  }

  private fun applyPending() {
    val svc = service ?: return
    commandCallback?.let { svc.commandCallback = it }
    pendingButtons?.let { svc.setButtons(it) }
    pendingMetadata?.let { svc.updateMetadata(it) }
    pendingState?.let { svc.updatePlaybackState(it) }
    if (pendingShow) svc.show()
  }
}
