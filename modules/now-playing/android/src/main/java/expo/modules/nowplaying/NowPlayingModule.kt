package expo.modules.nowplaying

import android.content.Context
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NowPlayingModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context lost")

  private val serviceManager by lazy { NowPlayingServiceManager(context, appContext) }

  override fun definition() = ModuleDefinition {
    Name("NowPlaying")

    Events("onCommand")

    AsyncFunction("updateMetadata") { metadata: NowPlayingMetadata ->
      serviceManager.updateMetadata(metadata)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("updatePlaybackState") { state: NowPlayingPlaybackState ->
      serviceManager.updatePlaybackState(state)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setButtons") { buttons: NowPlayingButtons ->
      serviceManager.setButtons(buttons)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("show") {
      serviceManager.show { command, positionMs ->
        sendEvent("onCommand", mapOf(
          "command" to command,
          "positionMs" to positionMs
        ))
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("hide") {
      serviceManager.hide()
    }.runOnQueue(Queues.MAIN)

    OnDestroy {
      serviceManager.hide()
    }
  }
}
