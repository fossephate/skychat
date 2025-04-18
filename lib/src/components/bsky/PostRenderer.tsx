import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AtpAgent } from '@atproto/api';
import { Button } from '../Button';
import { useEvent } from 'expo';


interface ParsedBskyPost {
  did: string;
  postId: string;
}

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





const { width } = Dimensions.get('window');

interface Post {
  text: string;
  media?: {
    type: string;
    url: string;
  }[];
}

export const PostRenderer = ({ url }: { url: string }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedPost, setParsedPost] = useState<ParsedBskyPost | null>(null);

  // Use parseBskyUrl to get the did and postId
  useEffect(() => {
    const parseUrl = async () => {
      try {
        const parsed = await parseBskyUrl(url);
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

        // Initialize ATP Agent
        const agent = new AtpAgent({ service: 'https://bsky.social' });

        // Use the parsed did and postId to construct the URI
        const response = await agent.app.bsky.feed.getPostThread({
          uri: `at://${parsedPost.did}/app.bsky.feed.post/${parsedPost.postId}`
        });

        // Extract post data
        const postData = response.data.thread.post;

        // Extract media
        const media = postData.record.embed?.media?.map(item => ({
          type: item.type,
          url: item.url
        })) || [];

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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text>No post data available</Text>
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

  return (
    <View style={styles.container}>
      <Text style={styles.postText}>{post.text}</Text>

      {videoMedia ? (
        <VideoPlayerComponent videoUrl={videoMedia.url} />
      ) : (
        post.media?.map((media, index) => (
          <View key={index} style={styles.mediaContainer}>
            <Text>Media type: {media.type}</Text>
            <Text>URL: {media.url}</Text>
          </View>
        ))
      )}
    </View>
  );
};

// Separate component for handling video playback
const VideoPlayerComponent = ({ videoUrl }: { videoUrl: string }) => {
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = true;
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  return (
    <View style={styles.videoContainer}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      <View style={styles.controlsContainer}>
        <Button
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              player.play();
            }
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginVertical: 10,
  },
  postText: {
    fontSize: 16,
    marginBottom: 10,
  },
  mediaContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
  },
  videoContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  video: {
    width: width - 40,
    height: (width - 40) * 0.5625, // 16:9 aspect ratio
    borderRadius: 8,
    backgroundColor: '#000',
  },
  controlsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
    fontWeight: 'bold',
  },
});