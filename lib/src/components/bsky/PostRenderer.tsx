import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TextStyle,
  ViewStyle,
  Image,
  ImageStyle,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AtpAgent } from '@atproto/api';
import { useEvent } from 'expo';
import { useAppTheme } from '../../utils/useAppTheme';
import { ThemedStyle } from '../../theme';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';

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
      const resolved = await agent.com.atproto.identity.resolveHandle({
        handle: didOrHandle,
      });
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
      const resolved = await agent.com.atproto.identity.resolveHandle({
        handle: didOrHandle,
      });
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
      const resolved = await agent.com.atproto.identity.resolveHandle({
        handle: didOrHandle,
      });
      return { did: resolved.data.did, postId };
    }
  }

  throw new Error('Unsupported URL format');
}

const AspectRatioImage = ({
  uri,
  maxWidth = 300,
}: {
  uri: string;
  maxWidth?: number;
}) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const screenWidth = Dimensions.get('window').width;
  const imageWidth = maxWidth || screenWidth - 40; // Full width minus some padding

  useEffect(() => {
    // Get the image dimensions from the network
    Image.getSize(
      uri,
      (width, height) => {
        // Calculate the aspect ratio
        const aspectRatio = width / height;

        // Calculate the height based on the desired width and the aspect ratio
        const calculatedHeight = imageWidth / aspectRatio;

        setImageSize({
          width: imageWidth,
          height: calculatedHeight,
        });
      },
      (error) => {
        console.error('Error getting image size:', error);
      }
    );
  }, [uri, imageWidth]);

  // for web:
  // return (
  //   <Image
  //     source={{ uri }}
  //     style={{
  //       width: imageSize.width,
  //       height: imageSize.height,
  //       resizeMode: "contain",
  //       borderRadius: 8,
  //     }}
  //   />
  // );

  return (
    // TODO: make lightbox:
    // <ReactNativeZoomableView
    //   maxZoom={2}
    //   minZoom={0.5}
    //   zoomStep={0.5}
    //   initialZoom={1}
    //   bindToBorders={true}
    //   // style={{
    //   //   padding: 10,
    //   //   backgroundColor: 'green',
    //   // }}
    //   contentHeight={imageSize.height}
    //   contentWidth={imageSize.width}
    // >
      <Image
        source={{ uri }}
        style={{
          width: imageSize.width,
          height: imageSize.height,
          resizeMode: 'contain',
          borderRadius: 8,
        }}
      />
    // </ReactNativeZoomableView>
  );
};

interface Post {
  text: string;
  media?: {
    type: string;
    url: string;
  }[];
  author: {
    displayName: string;
    handle: string;
    avatar: string;
  };
  createdAt: string;
}

export const PostRenderer = ({
  url,
  agent,
}: {
  url: string;
  agent: AtpAgent;
}) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedPost, setParsedPost] = useState<ParsedBskyPost | null>(null);
  const { themed, theme } = useAppTheme();

  const mediaWidth = (width * 3) / 5;

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

        // Use the parsed did and postId to construct the URI
        const response = await agent.app.bsky.feed.getPostThread({
          uri: `at://${parsedPost.did}/app.bsky.feed.post/${parsedPost.postId}`,
        });

        // Extract post data
        // @ts-ignore
        const postData = response.data.thread.post;

        // console.log('postData', postData);

        // Extract media
        let media = [];
        if (postData.embed) {
          if (postData.embed.$type === 'app.bsky.embed.video#view') {
            media.push({
              type: 'video',
              url: postData.embed.playlist || postData.embed.thumbnail,
              thumbnailUrl: postData.embed.thumbnail,
            });
          }

          console.log('postData.embed', postData.embed);

          if (postData.embed.$type === 'app.bsky.embed.images#view') {
            for (const image of postData.embed.images) {
              console.log('image', image);
              media.push({
                type: 'image',
                url: image.fullsize,
              });
            }
          }

          if (postData.embed.$type === 'app.bsky.embed.record#view') {
            media.push({
              type: 'embed',
              url: postData.embed.record.uri,
            });
          }
        }

        setPost({
          text: postData.record.text,
          media,
          author: {
            displayName: postData.author.displayName,
            handle: postData.author.handle,
            avatar: postData.author.avatar,
          },
          createdAt: postData.createdAt,
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
        <ActivityIndicator
          size="large"
          color={theme.colors.palette.primary300}
        />
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
  const videoMedia = post.media?.find(
    (media) =>
      media.type === 'video' ||
      media.url.endsWith('.mp4') ||
      media.url.endsWith('.mov') ||
      media.url.includes('video')
  );

  const imageMedia = post.media?.find(
    (media) =>
      media.type === 'image' ||
      media.url.endsWith('jpg') ||
      media.url.endsWith('png') ||
      media.url.endsWith('gif')
  );

  console.log('imageMedia', imageMedia);

  const embedMedia = post.media?.find((media) => media.type === 'embed');

  return (
    <View style={themed($container)}>
      <View style={themed($authorContainer)}>
        <Image source={{ uri: post.author.avatar }} style={themed($avatar)} />
        <View style={themed($displayNameContainer)}>
          <Text numberOfLines={1} style={themed($displayName)}>
            {post.author.displayName}
          </Text>
          <Text numberOfLines={1} style={themed($handle)}>
            {`@${post.author.handle}`}
          </Text>
        </View>
        {/* <Text numberOfLines={1} style={themed($postTime)}>
          •{`1d`}
        </Text> */}
        {/* <Text numberOfLines={1} style={themed($postTime)}> </Text> */}
      </View>

      <Text style={themed($postText)}>{post.text}</Text>

      {videoMedia && <VideoPlayerComponent videoUrl={videoMedia.url} />}

      {imageMedia && (
        <View style={{ borderRadius: 24 }}>
          {/* <Image
            source={{ uri: imageMedia.url }}
            style={themed($imageContainer)}

          /> */}
          <AspectRatioImage uri={imageMedia.url} maxWidth={mediaWidth} />
        </View>
      )}

      {embedMedia && (
        <View style={themed($embedContainer)}>
          <PostRenderer url={embedMedia.url} agent={agent} />
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
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
  });
  const { themed } = useAppTheme();

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

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
  backgroundColor: colors.background,
  borderRadius: 16,
  paddingHorizontal: 8,
  paddingBottom: 8,
  paddingTop: 8,
  // marginBottom: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $embedContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
});

const $authorContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  width: (width * 3) / 5,
  flexShrink: 1,
});

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 16,
  height: 16,
  borderRadius: 16,
  marginRight: 4,
});

const $displayNameContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  flexShrink: 1,
  // flexGrow: 1,
});

const $displayName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: 'bold',
  color: colors.text,
  marginRight: 4,
  ellipsizeMode: 'tail',
  numberOfLines: 1,
  minWidth: 10,
  maxWidth: '70%',
  flexShrink: 1,
});

const $handle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  ellipsizeMode: 'tail',
  numberOfLines: 1,
  flexShrink: 10,
});

const $postTime: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $postText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  marginBottom: 10,
  marginTop: 8,
  color: colors.text,
  width: (width * 3) / 5,
  paddingHorizontal: 8,
});

const $videoContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: 'center',
});

const $image: ThemedStyle<ImageStyle> = () => ({});

const $video: ThemedStyle<ViewStyle> = () => ({
  width: (width * 3) / 5,
  height: ((width * 3) / 5) * 1.7777777777777777, // 9:16 aspect ratio
  borderRadius: 8,
  backgroundColor: '#000',
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error || 'red',
  fontWeight: 'bold',
});
