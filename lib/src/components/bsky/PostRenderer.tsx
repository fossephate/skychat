import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TextStyle, ViewStyle, Image, ImageStyle } from 'react-native';
import { useState, useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AtpAgent } from '@atproto/api';
import { useEvent } from 'expo';
import { useAppTheme } from '../../utils/useAppTheme';
import { ThemedStyle } from '../../theme';

interface ParsedBskyPost {
  did: string;
  postId: string;
}

const { width } = Dimensions.get('window');

export async function parseBskyUrl(url: string): Promise<ParsedBskyPost> {
  // Initialize ATP agent for handle resolution
  const agent = new AtpAgent({ service: 'https://bsky.social' });

  // Handle skylight.social URLs
  if (url.includes('skylight.social')) {
    const urlParts = url.split('/');
    const profileIndex = urlParts.indexOf('profile');

    if (profileIndex === -1 || profileIndex + 3 >= urlParts.length) {
      throw new Error('Invalid Skylight URL format');
    }

    let didOrHandle = urlParts[profileIndex + 1];
    const postId = urlParts[profileIndex + 3];

    if (!didOrHandle || !postId) {
      throw new Error('Invalid Skylight URL format');
    }

    // If it's already a DID, use it directly
    if (didOrHandle.startsWith('did:')) {
      return { did: didOrHandle, postId };
    }
    // Otherwise, resolve the handle to a DID
    else {
      const resolved = await agent.com.atproto.identity.resolveHandle({ handle: didOrHandle });
      return { did: resolved.data.did, postId };
    }
  }

  // Handle bsky.app URLs
  else if (url.includes('bsky.app')) {
    const urlParts = url.split('/');
    const profileIndex = urlParts.indexOf('profile');

    if (profileIndex === -1 || profileIndex + 3 >= urlParts.length) {
      throw new Error('Invalid Bsky URL format');
    }

    const handle = urlParts[profileIndex + 1];
    const postId = urlParts[profileIndex + 3];

    if (!handle || !postId) {
      throw new Error('Invalid Bsky URL format');
    }

    // Always resolve the handle to a DID
    const resolved = await agent.com.atproto.identity.resolveHandle({ handle });
    return { did: resolved.data.did, postId };
  }

  // Handle AT Protocol URLs
  else if (url.startsWith('at://')) {
    const urlWithoutProtocol = url.replace('at://', '');
    const parts = urlWithoutProtocol.split('/');

    if (parts.length < 3) {
      throw new Error('Invalid AT Protocol URL format');
    }

    let didOrHandle = parts[0];
    const postId = parts[2];

    if (!didOrHandle || !postId) {
      throw new Error('Invalid AT Protocol URL format');
    }

    // If it's already a DID, use it directly
    if (didOrHandle.startsWith('did:')) {
      return { did: didOrHandle, postId };
    }
    // Otherwise, resolve the handle to a DID
    else {
      const resolved = await agent.com.atproto.identity.resolveHandle({ handle: didOrHandle });
      return { did: resolved.data.did, postId };
    }
  }

  // Handle cases like at:did:plc:76iqtegcbbr4pbcxomka5pat/app.bsky.feed.post/3ln2jbdcn6d2p
  else if (url.startsWith('at:did:')) {
    const urlWithoutProtocol = url.replace('at:', '');
    const parts = urlWithoutProtocol.split('/');

    if (parts.length < 3) {
      throw new Error('Invalid AT Protocol URL format');
    }

    let didOrHandle = parts[0];
    const postId = parts[2];

    if (!didOrHandle || !postId) {
      throw new Error('Invalid AT Protocol URL format');
    }

    // If it's already a DID, use it directly
    if (didOrHandle.startsWith('did:')) {
      return { did: didOrHandle, postId };
    }
    // Otherwise, resolve the handle to a DID
    else {
      const resolved = await agent.com.atproto.identity.resolveHandle({ handle: didOrHandle });
      return { did: resolved.data.did, postId };
    }
  }

  throw new Error('Unsupported URL format');
}

interface Post {
  text: string;
  media?: {
    type: string;
    url: string;
  }[];
}

export const PostRenderer = ({ url, agent }: { url: string, agent: AtpAgent }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedPost, setParsedPost] = useState<ParsedBskyPost | null>(null);
  const { themed, theme } = useAppTheme();

  // Use parseBskyUrl to get the did and postId
  useEffect(() => {
    const parseUrl = async () => {
      try {
        const parsed = await parseBskyUrl(url);
        console.log('parsed', parsed);
        setParsedPost(parsed);
      } catch (err) {
        setError(err?.message || 'Failed to parse URL');
        setLoading(false);
      }
    };

    parseUrl();
  }, [url]);

  // Fetch post data once we have the parsed URL
  useEffect(() => {
    const fetchPost = async () => {
      if (!parsedPost) return;

      try {
        setLoading(true);

        // Use the parsed did and postId to construct the URI
        const response = await agent.app.bsky.feed.getPostThread({
          uri: `at://${parsedPost.did}/app.bsky.feed.post/${parsedPost.postId}`
        });

        // Extract post data
        const postData = response.data.thread.post;

        console.log('postData', postData);

        // Extract media
        let media = [];
        if (postData.embed) {

          if (postData.embed.$type === "app.bsky.embed.video#view") {
            media.push({
              type: 'video',
              url: postData.embed.playlist || postData.embed.thumbnail,
              thumbnailUrl: postData.embed.thumbnail
            });
          }

          console.log('postData.embed', postData.embed);

          if (postData.embed.$type === "app.bsky.embed.images#view") {
            for (const image of postData.embed.images) {
              console.log('image', image);
              media.push({
                type: 'image',
                url: image.fullsize,
              });
            }
          }
        }

        setPost({
          text: postData.record.text,
          media
        });
      } catch (err) {
        setError(err.message || 'Failed to fetch post');
      } finally {
        setLoading(false);
      }
    };

    if (parsedPost) {
      fetchPost();
    }
  }, [parsedPost]);

  if (loading) {
    return (
      <View style={themed($container)}>
        <ActivityIndicator size="large" color={theme.colors.palette.primary300} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={themed($container)}>
        <Text style={themed($errorText)}>Error: {error}</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={themed($container)}>
        <Text style={themed($postText)}>No post data available</Text>
      </View>
    );
  }

  // Check if the post has video content
  const videoMedia = post.media?.find(media =>
    media.type === 'video' ||
    media.url.endsWith('.mp4') ||
    media.url.endsWith('.mov') ||
    media.url.includes('video')
  );

  const imageMedia = post.media?.find(media =>
    media.type === 'image' ||
    media.url.endsWith('jpg') ||
    media.url.endsWith('png') ||
    media.url.endsWith('gif')
  );

  console.log('imageMedia', imageMedia);

  return (
    <View style={themed($container)}>
      {/* <Text style={themed($postText)}>{post.text}</Text> */}

      {videoMedia && (
        <VideoPlayerComponent videoUrl={videoMedia.url} />
      )}

      {imageMedia && (
        <View style={themed($imageContainer)}>
          <Image source={{ uri: imageMedia.url }} style={{width: 200, height: 200}} />
        </View>
      )}

      {/* {videoMedia ? (
        <VideoPlayerComponent videoUrl={videoMedia.url} />
      ) : (
        post.media?.map((media, index) => (
          <View key={index} style={themed($mediaContainer)}>
            <Text style={themed($postText)}>Media type: {media.type}</Text>
            <Text style={themed($postText)}>URL: {media.url}</Text>
          </View>
        ))
      )} */}
    </View>
  );
};

// Separate component for handling video playback
const VideoPlayerComponent = ({ videoUrl }: { videoUrl: string }) => {
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = true;
  });
  const { themed } = useAppTheme();

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  return (
    <View style={themed($videoContainer)}>
      <VideoView
        style={themed($video)}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
};

// Define themed styles
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: 'transparent',
  borderRadius: 8,
  // paddingVertical: 8,
  paddingHorizontal: 4,
  paddingBottom: 2,
  // marginVertical: 10,
  paddingTop: 4,
});

const $postText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  marginBottom: 10,
  color: colors.text,
});

const $videoContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: 'center',
});

const $imageContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: 'center',
  width: (width * 2 / 5),
  height: (width * 2 / 5) * 1.7777777777777777, // 9:16 aspect ratio
});

const $image: ThemedStyle<ImageStyle> = () => ({

});



const $video: ThemedStyle<ViewStyle> = () => ({
  width: (width * 2 / 5),
  height: (width * 2 / 5) * 1.7777777777777777, // 9:16 aspect ratio
  borderRadius: 8,
  backgroundColor: '#000',
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error || 'red',
  fontWeight: 'bold',
});