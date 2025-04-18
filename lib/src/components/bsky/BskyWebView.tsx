import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

export const BlueskyEmbed = () => {
  // HTML content with the Bluesky embed
  const htmlContent = `
<blockquote className="bluesky-embed" data-bluesky-uri="at://did:plc:76iqtegcbbr4pbcxomka5pat/app.bsky.feed.post/3lmgffpxwrr2h" data-bluesky-cid="bafyreihx4yfm4xod23x3iloc7wyiyoplewzbg4e2esw7c6d5jyel5cq5we" data-bluesky-embed-color-mode="system"><p lang="">Save your great content! #tiktokban #repurposeio #skylightsocial #greenscreen<br /><br /><a href="https://bsky.app/profile/did:plc:76iqtegcbbr4pbcxomka5pat/post/3lmgffpxwrr2h?ref_src=embed">[image or embed]</a></p>— Tori (<a href="https://bsky.app/profile/did:plc:76iqtegcbbr4pbcxomka5pat?ref_src=embed">@buildwithtori.com</a>) <a href="https://bsky.app/profile/did:plc:76iqtegcbbr4pbcxomka5pat/post/3lmgffpxwrr2h?ref_src=embed">April 9, 2025 at 6:52 PM</a></blockquote><script async src="https://embed.bsky.app/static/embed.js" charSet="utf-8" />
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        automaticallyAdjustContentInsets={true}
        injectedJavaScript={`
          // Adjust height to content after load
          const resizeObserver = new ResizeObserver(() => {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                height: document.body.scrollHeight
              })
            );
          });
          resizeObserver.observe(document.body);
          true;
        `}
        onMessage={(event) => {
          try {
            const { height } = JSON.parse(event.nativeEvent.data);
            // You can use this to dynamically adjust height if needed
          } catch (error) {
            console.error('Error parsing WebView message', error);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    height: 300,
    width: 200,
  },
  webview: {
    width: 200,
    minHeight: 300, // Default height before content loads
  },
});

export default BlueskyEmbed;