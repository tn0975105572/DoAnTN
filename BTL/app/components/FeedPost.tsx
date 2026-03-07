import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Define constants locally or import them if they are in a shared file. 
// For now, I'll redefine them to match home.tsx to ensure it works immediately.
const COLORS = {
  primary: '#7f001f',
  text: '#222222',
  textSecondary: '#777777',
};

export interface HydratedPost {
  type: 'post';
  ID_BaiDang: string;
  ID_NguoiDung: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  description: string;
  price: string;
  location: string;
  time: string;
  imageUrls: string[];
  liked: boolean;
  likeCount: number;
  commentCount: number;
  userLikeId?: string;
}

interface FeedPostProps {
  post: HydratedPost;
  onLike: (id: string) => void;
  canPress: boolean;
  onReport: (post: HydratedPost) => void;
}

const FeedPost = React.memo(
  ({ post, onLike, canPress, onReport }: FeedPostProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxLines = 3;
    const description = post.description || ''; // Ensure string

    const onShare = async () => {
      const shareMessage = `Hãy xem bài đăng "${post.title}" của ${post.authorName} trên OLODO!${description ? `\n\n"${description}"` : ''
        }`;
      try {
        await Share.share({ message: shareMessage });
      } catch (error: any) {
        console.error('Error sharing:', error.message);
      }
    };

    const formatCount = (count: number) =>
      count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();

    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
      <View className="bg-white my-1">
        <View className="flex-row items-center p-4">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/components/CaNhan/canhan',
                params: { userId: post.ID_NguoiDung },
              })
            }
            activeOpacity={0.8}
          >
            <Image
              className="w-10 h-10 rounded-full mr-3"
              source={{ uri: post.authorAvatar || 'https://i.pravatar.cc/50' }}
            />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#222]">{post.authorName}</Text>
            <Text className="text-xs text-[#777]">
              {post.time} | {post.location}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onReport(post)}>
            <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text className="text-base font-bold text-[#222] leading-6 px-4 mb-2">{post.title}</Text>
        <Text
          className={`text-sm text-[#777] leading-5 px-4 mb-2 ${isExpanded ? '' : 'max-h-[60px] overflow-hidden'
            }`}
          numberOfLines={isExpanded ? 0 : maxLines}
        >
          {description}
        </Text>
        {description.length > 100 && !isExpanded && (
          <TouchableOpacity onPress={toggleExpand} className="px-4 mb-2">
            <Text className="text-sm text-[#7f001f] font-medium">Xem thêm</Text>
          </TouchableOpacity>
        )}
        {isExpanded && (
          <TouchableOpacity onPress={toggleExpand} className="px-4 mb-2 self-start">
            <Text className="text-sm text-[#7f001f] font-medium">Thu gọn</Text>
          </TouchableOpacity>
        )}
        <Text className="text-base font-bold text-red-600 px-4 mb-2">{post.price} VNĐ</Text>
        {post.imageUrls.length > 0 && (
          <TouchableOpacity
            className="w-full relative"
            onPress={() => {
              if (!canPress) return;
              try {
                router.push({
                  pathname: '/components/BaiDang/chitietbaidang',
                  params: { postId: post.ID_BaiDang },
                });
              } catch (error) {
                console.error('Navigation error:', error);
              }
            }}
            activeOpacity={0.8}
            delayPressIn={50}
            disabled={!canPress}
          >
            <View className="w-full h-52 relative overflow-hidden rounded-lg">
              {post.imageUrls.length === 1 ? (
                <Image
                  source={{ uri: post.imageUrls[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                  loadingIndicatorSource={{
                    uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                  }}
                  fadeDuration={300}
                />
              ) : post.imageUrls.length === 2 ? (
                <View className="flex-row h-full">
                  <Image
                    source={{ uri: post.imageUrls[0] }}
                    className="w-1/2 h-full rounded-l-lg"
                    resizeMode="cover"
                    loadingIndicatorSource={{
                      uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                    }}
                    fadeDuration={300}
                  />
                  <Image
                    source={{ uri: post.imageUrls[1] }}
                    className="w-1/2 h-full rounded-r-lg"
                    resizeMode="cover"
                    loadingIndicatorSource={{
                      uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                    }}
                    fadeDuration={300}
                  />
                </View>
              ) : post.imageUrls.length === 3 ? (
                <View className="w-full h-full">
                  <Image
                    source={{ uri: post.imageUrls[0] }}
                    className="w-full h-2/3 rounded-t-lg"
                    resizeMode="cover"
                  />
                  <View className="flex-row w-full h-1/3">
                    <Image
                      source={{ uri: post.imageUrls[1] }}
                      className="w-1/2 h-full"
                      resizeMode="cover"
                    />
                    <Image
                      source={{ uri: post.imageUrls[2] }}
                      className="w-1/2 h-full rounded-br-lg"
                      resizeMode="cover"
                    />
                  </View>
                </View>
              ) : post.imageUrls.length === 4 ? (
                <View className="flex-row w-full h-full">
                  <View className="w-1/2 h-full flex-col">
                    <Image
                      source={{ uri: post.imageUrls[0] }}
                      className="w-full h-1/2 rounded-tl-lg"
                      resizeMode="cover"
                    />
                    <Image
                      source={{ uri: post.imageUrls[2] }}
                      className="w-full h-1/2 rounded-bl-lg"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="w-1/2 h-full flex-col">
                    <Image
                      source={{ uri: post.imageUrls[1] }}
                      className="w-full h-1/2 rounded-tr-lg"
                      resizeMode="cover"
                    />
                    <Image
                      source={{ uri: post.imageUrls[3] }}
                      className="w-full h-1/2 rounded-br-lg"
                      resizeMode="cover"
                    />
                  </View>
                </View>
              ) : (
                <View className="w-full h-full relative">
                  <View className="flex-row w-full h-full">
                    <View className="w-1/2 h-full flex-col">
                      <Image
                        source={{ uri: post.imageUrls[0] }}
                        className="w-full h-1/2 rounded-tl-lg"
                        resizeMode="cover"
                      />
                      <Image
                        source={{ uri: post.imageUrls[2] }}
                        className="w-full h-1/2 rounded-bl-lg"
                        resizeMode="cover"
                      />
                    </View>
                    <View className="w-1/2 h-full flex-col">
                      <Image
                        source={{ uri: post.imageUrls[1] }}
                        className="w-full h-1/2 rounded-tr-lg"
                        resizeMode="cover"
                      />
                      <Image
                        source={{ uri: post.imageUrls[3] }}
                        className="w-full h-1/2 rounded-br-lg"
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                  {post.imageUrls.length > 4 && (
                    <View className="absolute bottom-2 right-2 bg-black/60 rounded-full px-3 py-1 items-center justify-center min-w-[40px]">
                      <Text className="text-white font-bold text-base">
                        +{post.imageUrls.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        <View className="flex-row px-4 py-2">
          <TouchableOpacity
            onPress={() => {
              if (post.likeCount > 0) {
                router.push({
                  pathname: '/components/BaiDang/danhsachlike',
                  params: { postId: post.ID_BaiDang },
                });
              }
            }}
            disabled={post.likeCount === 0}
          >
            <Text className={`text-xs text-[#777] mr-4 ${post.likeCount > 0 ? 'underline' : ''}`}>
              {formatCount(post.likeCount)} Likes
            </Text>
          </TouchableOpacity>
          <Text className="text-xs text-[#777] mr-4">
            {formatCount(post.commentCount)} Comments
          </Text>
          <Text className="text-xs text-[#777]">12K Shares</Text>
        </View>
        <View className="h-[1px] bg-[#EEE] mx-4 my-2" />
        <View className="flex-row justify-around px-4 pb-3">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => onLike(post.ID_BaiDang)}
          >
            <Ionicons
              name={post.liked ? 'heart' : 'heart-outline'}
              size={22}
              color={post.liked ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              className={`ml-2 text-sm font-medium ${post.liked ? 'text-[#7f001f]' : 'text-[#777]'}`}
            >
              {post.liked ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() =>
              router.push({
                pathname: '/components/BaiDang/binhluanbaidang',
                params: { postId: post.ID_BaiDang },
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={22} color={COLORS.textSecondary} />
            <Text className="ml-2 text-sm font-medium text-[#777]">Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center" onPress={onShare}>
            <Ionicons name="share-social-outline" size={22} color={COLORS.textSecondary} />
            <Text className="ml-2 text-sm font-medium text-[#777]">Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => {
              router.push({
                pathname: '/components/TinNhan/chitiettinnhan',
                params: {
                  userId: post.ID_NguoiDung || post.authorName,
                  userName: post.authorName,
                  userAvatar: post.authorAvatar,
                  hasExistingConversation: 'false',
                  sharePost: 'true',
                  postId: post.ID_BaiDang,
                  postTitle: post.title,
                  postImage: post.imageUrls[0] || '',
                },
              });
            }}
          >
            <Ionicons name="chatbox-outline" size={22} color={COLORS.primary} />
            <Text className="ml-2 text-sm font-medium text-[#7f001f]">Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function để tối ưu re-render
    return (
      prevProps.post.ID_BaiDang === nextProps.post.ID_BaiDang &&
      prevProps.post.liked === nextProps.post.liked &&
      prevProps.post.likeCount === nextProps.post.likeCount &&
      prevProps.canPress === nextProps.canPress
    );
  },
);

FeedPost.displayName = 'FeedPost';

export default FeedPost;
