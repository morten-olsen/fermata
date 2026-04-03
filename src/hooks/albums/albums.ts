import { useCallback } from "react";

import { AlbumsService } from "@/src/services/albums/albums";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";

const albumEvents = ['changed'] as const;

const useAlbums = () => {
  const albumsService = useService(AlbumsService);
  const query = useCallback(() => albumsService.findAll(), [albumsService]);

  const { data: albums = [], loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
  });

  return { albums, loading };
};

const useAlbum = (id: string) => {
  const albumsService = useService(AlbumsService);
  const query = useCallback(() => albumsService.findById(id), [albumsService, id]);

  const { data: album, loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
  });

  return { album, loading };
};

const useAlbumTracks = (albumId: string) => {
  const albumsService = useService(AlbumsService);
  const query = useCallback(() => albumsService.getTracks(albumId), [albumsService, albumId]);

  const { data: tracks = [], loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
  });

  return { tracks, loading };
};

const useAlbumsByArtist = (artistName: string) => {
  const albumsService = useService(AlbumsService);
  const query = useCallback(
    () => albumsService.findByArtist(artistName),
    [albumsService, artistName],
  );

  const { data: albums = [], loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
  });

  return { albums, loading };
};

export { useAlbums, useAlbum, useAlbumTracks, useAlbumsByArtist };
