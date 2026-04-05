package expo.modules.nowplaying

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.net.URL

class NowPlayingMetadata : Record {
  @Field val title: String = ""
  @Field val artist: String? = null
  @Field val albumTitle: String? = null
  @Field val artworkUrl: URL? = null
  @Field val durationMs: Double? = null
}

class NowPlayingPlaybackState : Record {
  @Field val playing: Boolean = false
  @Field val positionMs: Double? = null
  @Field val playbackRate: Double? = null
}

class NowPlayingButtons : Record {
  @Field val skipNext: Boolean? = null
  @Field val skipPrevious: Boolean? = null
  @Field val seekForward: Boolean? = null
  @Field val seekBackward: Boolean? = null
}
