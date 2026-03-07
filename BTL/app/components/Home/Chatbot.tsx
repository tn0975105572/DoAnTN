import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

// Custom Chatbot Icon Component
const CustomChatbotIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => {
  const s = size;
  const accentColor = color === '#FFFFFF' ? '#7f001f' : '#FFFFFF';

  return (
    <View
      style={{
        width: s,
        height: s,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: s * 0.7,
          height: s * 0.28,
          backgroundColor: color,
          borderRadius: s * 0.14,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          marginBottom: s * 0.02,
        }}
      >
        <View
          style={{
            width: s * 0.1,
            height: s * 0.06,
            backgroundColor: accentColor,
            borderRadius: 1,
            marginHorizontal: s * 0.03,
          }}
        />
        <View
          style={{
            width: s * 0.1,
            height: s * 0.06,
            backgroundColor: accentColor,
            borderRadius: 1,
            marginHorizontal: s * 0.03,
          }}
        />
      </View>

      <View
        style={{
          width: s * 0.6,
          height: s * 0.42,
          backgroundColor: color,
          borderRadius: s * 0.1,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <View
          style={{
            width: s * 0.06,
            height: s * 0.06,
            backgroundColor: accentColor,
            borderRadius: s * 0.03,
            marginHorizontal: s * 0.02,
          }}
        />
        <View
          style={{
            width: s * 0.06,
            height: s * 0.06,
            backgroundColor: accentColor,
            borderRadius: s * 0.03,
            marginHorizontal: s * 0.02,
          }}
        />
        <View
          style={{
            width: s * 0.06,
            height: s * 0.06,
            backgroundColor: accentColor,
            borderRadius: s * 0.03,
            marginHorizontal: s * 0.02,
          }}
        />
      </View>
    </View>
  );
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi có thể giúp gì cho bạn?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const CEREBRAS_API_KEY = 'csk-mx2e938eyhxp6ewpyfhkwtf5kv9h5ppky43m9mrnnrprdtey';

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    const userMessageText = inputText;

    // 1. Thêm tin nhắn user
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userMessageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 2. Call Cerebras API
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama3.1-8b', // Thay đổi model sang 8b để đảm bảo hoạt động
          messages: [
            { role: 'system', content: 'Bạn là trợ lý ảo hữu ích, trả lời ngắn gọn, thân thiện bằng tiếng Việt.' },
            // Gửi kèm lịch sử chat gần nhất để có context (nếu cần)
            ...messages.slice(-4).map(m => ({
              role: m.isUser ? 'user' : 'assistant',
              content: m.text
            })),
            { role: 'user', content: userMessageText }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Cerebras API Error');
      }

      const botContent = data.choices?.[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';

      // 3. Thêm tin nhắn bot
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botContent,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error: any) {
      console.error('Chat error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể kết nối với Chatbot.',
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Đã có lỗi xảy ra khi kết nối máy chủ.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.botMessage]}>
      <Text style={[styles.messageText, item.isUser && styles.userMessageText]}>{item.text}</Text>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );

  return (
    <>
      {/* Floating Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <CustomChatbotIcon size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <CustomChatbotIcon size={24} color="#7f001f" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Chat hỗ trợ</Text>
                  <Text style={styles.headerSubtitle}>Sử dụng Cerebras AI</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#222222" />
              </TouchableOpacity>
            </View>

            {/* Messages List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#7f001f" />
                <Text style={styles.loadingText}>Đang trả lời...</Text>
              </View>
            )}

            {/* Input Area */}
            <View style={styles.inputContainer}>
              <View style={styles.textInputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tin nhắn..."
                  placeholderTextColor="#999"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />

                <TouchableOpacity
                  onPress={handleSend}
                  style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7f001f',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    backgroundColor: '#7f001f',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#F5F5F5',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#222222',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingBottom: 10
  },
  loadingText: {
    marginLeft: 10,
    color: '#777',
    fontSize: 12
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 14,
    color: '#222222',
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7f001f',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});

export default Chatbot;