import ExpoModulesCore
import MediaPlayer
import UIKit

public class NowPlayingModule: Module {
  private let infoCenter = MPNowPlayingInfoCenter.default()
  private let commandCenter = MPRemoteCommandCenter.shared()
  private var isActive = false
  private var currentButtons = NowPlayingButtons()
  private var currentArtworkUrl: URL?
  private var cachedArtwork: MPMediaItemArtwork?

  public func definition() -> ModuleDefinition {
    Name("NowPlaying")

    Events("onCommand")

    Function("updateMetadata") { (metadata: NowPlayingMetadata) in
      var info = infoCenter.nowPlayingInfo ?? [String: Any]()
      info[MPMediaItemPropertyTitle] = metadata.title
      info[MPMediaItemPropertyArtist] = metadata.artist
      info[MPMediaItemPropertyAlbumTitle] = metadata.albumTitle
      if let durationMs = metadata.durationMs {
        info[MPMediaItemPropertyPlaybackDuration] = durationMs / 1000.0
      }
      if let artworkUrl = metadata.artworkUrl {
        if let cachedArtwork {
          info[MPMediaItemPropertyArtwork] = cachedArtwork
        }
        infoCenter.nowPlayingInfo = info
        loadArtwork(url: artworkUrl)
      } else {
        cachedArtwork = nil
        currentArtworkUrl = nil
        info.removeValue(forKey: MPMediaItemPropertyArtwork)
        infoCenter.nowPlayingInfo = info
      }
    }

    Function("updatePlaybackState") { (state: NowPlayingPlaybackState) in
      var info = infoCenter.nowPlayingInfo ?? [String: Any]()
      info[MPNowPlayingInfoPropertyPlaybackRate] = state.playing ? (state.playbackRate ?? 1.0) : 0.0
      if let positionMs = state.positionMs {
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = positionMs / 1000.0
      }
      info[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue
      infoCenter.nowPlayingInfo = info
    }

    Function("setButtons") { (buttons: NowPlayingButtons) in
      currentButtons = buttons
      if isActive {
        configureCommands()
      }
    }

    Function("show") {
      isActive = true
      configureCommands()
    }

    Function("hide") {
      isActive = false
      disableCommands()
      infoCenter.nowPlayingInfo = nil
    }

    OnDestroy {
      disableCommands()
      infoCenter.nowPlayingInfo = nil
    }
  }

  private func configureCommands() {
    commandCenter.playCommand.isEnabled = true
    commandCenter.playCommand.removeTarget(nil)
    commandCenter.playCommand.addTarget { [weak self] _ in
      self?.sendEvent("onCommand", ["command": "play"])
      return .success
    }

    commandCenter.pauseCommand.isEnabled = true
    commandCenter.pauseCommand.removeTarget(nil)
    commandCenter.pauseCommand.addTarget { [weak self] _ in
      self?.sendEvent("onCommand", ["command": "pause"])
      return .success
    }

    commandCenter.togglePlayPauseCommand.isEnabled = true
    commandCenter.togglePlayPauseCommand.removeTarget(nil)
    commandCenter.togglePlayPauseCommand.addTarget { [weak self] _ in
      // iOS sends toggle for headphone button — resolve to play/pause
      let info = MPNowPlayingInfoCenter.default().nowPlayingInfo
      let rate = info?[MPNowPlayingInfoPropertyPlaybackRate] as? Double ?? 0
      let command = rate > 0 ? "pause" : "play"
      self?.sendEvent("onCommand", ["command": command])
      return .success
    }

    commandCenter.changePlaybackPositionCommand.isEnabled = true
    commandCenter.changePlaybackPositionCommand.removeTarget(nil)
    commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
      guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
      self?.sendEvent("onCommand", [
        "command": "seek",
        "positionMs": event.positionTime * 1000.0
      ])
      return .success
    }

    let showSkipNext = currentButtons.skipNext ?? false
    commandCenter.nextTrackCommand.isEnabled = showSkipNext
    commandCenter.nextTrackCommand.removeTarget(nil)
    if showSkipNext {
      commandCenter.nextTrackCommand.addTarget { [weak self] _ in
        self?.sendEvent("onCommand", ["command": "skipNext"])
        return .success
      }
    }

    let showSkipPrevious = currentButtons.skipPrevious ?? false
    commandCenter.previousTrackCommand.isEnabled = showSkipPrevious
    commandCenter.previousTrackCommand.removeTarget(nil)
    if showSkipPrevious {
      commandCenter.previousTrackCommand.addTarget { [weak self] _ in
        self?.sendEvent("onCommand", ["command": "skipPrevious"])
        return .success
      }
    }

    let showSeekForward = currentButtons.seekForward ?? false
    commandCenter.skipForwardCommand.isEnabled = showSeekForward
    commandCenter.skipForwardCommand.preferredIntervals = [10.0]
    commandCenter.skipForwardCommand.removeTarget(nil)
    if showSeekForward {
      commandCenter.skipForwardCommand.addTarget { [weak self] _ in
        self?.sendEvent("onCommand", ["command": "seekForward"])
        return .success
      }
    }

    let showSeekBackward = currentButtons.seekBackward ?? false
    commandCenter.skipBackwardCommand.isEnabled = showSeekBackward
    commandCenter.skipBackwardCommand.preferredIntervals = [10.0]
    commandCenter.skipBackwardCommand.removeTarget(nil)
    if showSeekBackward {
      commandCenter.skipBackwardCommand.addTarget { [weak self] _ in
        self?.sendEvent("onCommand", ["command": "seekBackward"])
        return .success
      }
    }
  }

  private func disableCommands() {
    commandCenter.playCommand.isEnabled = false
    commandCenter.playCommand.removeTarget(nil)
    commandCenter.pauseCommand.isEnabled = false
    commandCenter.pauseCommand.removeTarget(nil)
    commandCenter.togglePlayPauseCommand.isEnabled = false
    commandCenter.togglePlayPauseCommand.removeTarget(nil)
    commandCenter.changePlaybackPositionCommand.isEnabled = false
    commandCenter.changePlaybackPositionCommand.removeTarget(nil)
    commandCenter.nextTrackCommand.isEnabled = false
    commandCenter.nextTrackCommand.removeTarget(nil)
    commandCenter.previousTrackCommand.isEnabled = false
    commandCenter.previousTrackCommand.removeTarget(nil)
    commandCenter.skipForwardCommand.isEnabled = false
    commandCenter.skipForwardCommand.removeTarget(nil)
    commandCenter.skipBackwardCommand.isEnabled = false
    commandCenter.skipBackwardCommand.removeTarget(nil)
  }

  private func loadArtwork(url: URL) {
    if url == currentArtworkUrl, cachedArtwork != nil { return }
    currentArtworkUrl = url
    URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
      guard let self, error == nil, let data, let image = UIImage(data: data) else { return }
      let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
      DispatchQueue.main.async {
        self.cachedArtwork = artwork
        var info = self.infoCenter.nowPlayingInfo ?? [String: Any]()
        info[MPMediaItemPropertyArtwork] = artwork
        self.infoCenter.nowPlayingInfo = info
      }
    }.resume()
  }
}

// MARK: - Records

struct NowPlayingMetadata: Record {
  @Field var title: String = ""
  @Field var artist: String?
  @Field var albumTitle: String?
  @Field var artworkUrl: URL?
  @Field var durationMs: Double?
}

struct NowPlayingPlaybackState: Record {
  @Field var playing: Bool = false
  @Field var positionMs: Double?
  @Field var playbackRate: Double?
}

struct NowPlayingButtons: Record {
  @Field var skipNext: Bool?
  @Field var skipPrevious: Bool?
  @Field var seekForward: Bool?
  @Field var seekBackward: Bool?
}
