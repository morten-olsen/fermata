import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { MediaRow } from "./media-row";

const meta: Meta<typeof MediaRow> = {
  title: "data-display/MediaRow",
  component: MediaRow,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MediaRow>;

const noop = () => {};

export const TrackDefault: Story = {
  render: () => (
    <MediaRow.Track
      title="Midnight City"
      artistName="M83"
      duration={243}
      trackNumber={4}
      onPress={noop}
      onMorePress={noop}
    />
  ),
};

export const TrackPlaying: Story = {
  render: () => (
    <MediaRow.Track
      title="Midnight City"
      artistName="M83"
      duration={243}
      trackNumber={4}
      isPlaying
      onPress={noop}
      onMorePress={noop}
    />
  ),
};

export const TrackCompleted: Story = {
  render: () => (
    <MediaRow.Track
      title="Midnight City"
      artistName="M83"
      duration={243}
      trackNumber={4}
      isCompleted
      onPress={noop}
      onMorePress={noop}
    />
  ),
};

export const TrackWithProgress: Story = {
  render: () => (
    <MediaRow.Track
      title="Chapter 12: The Library"
      artistName="Brandon Sanderson"
      duration={1820}
      trackNumber={12}
      progress={0.4}
      onPress={noop}
      onMorePress={noop}
    />
  ),
};

export const EpisodeDefault: Story = {
  render: () => (
    <MediaRow.Episode
      title="The Future of Web Standards"
      dateLabel="Mar 28, 2026"
      duration={2460}
      episodeNumber={187}
      onPress={noop}
      onMorePress={noop}
    />
  ),
};

export const EpisodePlaying: Story = {
  render: () => (
    <MediaRow.Episode
      title="The Future of Web Standards"
      dateLabel="Mar 28, 2026"
      duration={2460}
      episodeNumber={187}
      isPlaying
      onPress={noop}
      onMorePress={noop}
    />
  ),
};

export const ChapterDefault: Story = {
  render: () => (
    <MediaRow.Chapter
      title="Part One: The Boy Who Lived"
      artistName="J.K. Rowling"
      duration={3540}
      chapterNumber={1}
      onPress={noop}
    />
  ),
};

export const CustomComposition: Story = {
  render: () => (
    <MediaRow onPress={noop} isPlaying>
      <MediaRow.Leading>
        <MediaRow.PlayingIndicator />
      </MediaRow.Leading>
      <MediaRow.Content title="Custom Row" subtitle="Composed with sub-components">
        <MediaRow.Progress value={0.65} />
      </MediaRow.Content>
      <MediaRow.Trailing>
        <MediaRow.DownloadBadge />
        <MediaRow.Duration seconds={312} />
        <MediaRow.MoreButton onPress={noop} />
      </MediaRow.Trailing>
    </MediaRow>
  ),
};
