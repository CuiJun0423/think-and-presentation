import React, { useState, useRef, useEffect } from 'react';
import { Typography, Input, Button, Card, Space, Divider, Radio, message, Switch, Select, Spin, Alert } from 'antd';
import styled, { keyframes } from 'styled-components';
import { SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import * as apiService from '../services/api';
import { ApiProvider } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useNavigate } from 'react-router-dom';
import { AIRole } from '../components/AIMessage';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 导入Message类型或重新定义一个兼容的类型
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 定义聊天消息类型
interface ChatMessage {
  role: string;
  content: string;
  id: number;
}

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
`;

const StyledTitle = styled(Title)`
  margin: 0 !important;
  margin-left: 1rem !important;
`;

const InputContainer = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const SendButton = styled(Button)`
  position: absolute;
  bottom: 8px;
  right: 8px;
`;

const MessagesContainer = styled.div`
  margin-top: 1rem;
  min-height: 200px;
`;

const MessageCard = styled(Card)`
  margin-bottom: 1rem;
  .ant-card-body {
    padding: 12px;
  }
`;

const RawResponseCard = styled(Card)`
  margin-top: 1rem;
  margin-bottom: 1rem;
  background-color: #1e1e1e;
  .ant-card-body {
    padding: 12px;
    max-height: 400px;
    overflow-y: auto;
  }
`;

const RawResponseLine = styled.div<{ isData: boolean }>`
  font-family: monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  margin-bottom: 4px;
  padding: 2px 4px;
  background-color: ${props => props.isData ? 'rgba(59, 130, 246, 0.1)' : 'transparent'};
  border-left: ${props => props.isData ? '2px solid #3b82f6' : 'none'};
`;

const ControlsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 1rem;
  align-items: center;
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const Cursor = styled.span`
  display: inline-block;
  width: 0.5em;
  height: 1em;
  background-color: #3b82f6;
  animation: ${blink} 1s infinite;
`;

// 添加缺少的组件定义
const StyledCard = styled(Card)`
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  background-color: #1e293b;
`;

const ResponseContainer = styled.div`
  background-color: rgba(30, 41, 59, 0.7);
  border-left: 3px solid #3b82f6;
  border-radius: 0 8px 8px 0;
  padding: 16px;
  margin-top: 1rem;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
`;

const StatsCard = styled(Card)`
  margin-top: 0.5rem;
  background-color: rgba(30, 41, 59, 0.5);
`;

const MarkdownContent = styled.div`
  color: #f8fafc;
  font-size: 15px;
  line-height: 1.6;

  h1, h2, h3, h4, h5, h6 {
    color: #f1f5f9;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.3rem; }
  h3 { font-size: 1.15rem; }

  p {
    margin-bottom: 0.8rem;
  }

  ul, ol {
    padding-left: 1.5rem;
    margin-bottom: 0.8rem;
  }

  li {
    margin-bottom: 0.3rem;
  }

  code {
    background-color: rgba(15, 23, 42, 0.5);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
  }

  pre {
    background-color: rgba(15, 23, 42, 0.5);
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  blockquote {
    border-left: 3px solid #3b82f6;
    padding-left: 1rem;
    color: #cbd5e1;
    font-style: italic;
    margin: 1rem 0;
  }

  a {
    color: #3b82f6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1rem;
  }

  th, td {
    border: 1px solid #334155;
    padding: 0.5rem;
  }

  th {
    background-color: rgba(15, 23, 42, 0.5);
  }

  hr {
    border: none;
    border-top: 1px solid #334155;
    margin: 1.5rem 0;
  }
`;

// API选项定义
type APIOption = {
  key: ApiProvider;
  label: string;
  description: string;
  model: string;
  role?: AIRole;
};

const API_OPTIONS: APIOption[] = [
  { 
    key: ApiProvider.DEEPSEEK, 
    label: 'DeepSeek API (蓝鲸)',
    description: '支持更长的上下文，响应质量较高',
    model: 'deepseek-chat',
    role: '蓝鲸'
  },
  { 
    key: ApiProvider.HUNYUAN, 
    label: '腾讯混元 API (小元)',
    description: '支持中文特化，响应速度较快',
    model: 'hunyuan-turbos-latest',
    role: '小元'
  },
  { 
    key: ApiProvider.MOONSHOT, 
    label: 'Moonshot API (暗面)',
    description: '支持8K上下文，推理能力强',
    model: 'moonshot-v1-8k',
    role: '暗面'
  },
  { 
    key: ApiProvider.DOUBAO, 
    label: '豆包 API (包包)',
    description: '支持32K上下文，中文语言输出自然',
    model: 'doubao-1-5-pro-32k-250115',
    role: '包包'
  }
];

const StreamTest: React.FC = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [responseId, setResponseId] = useState<string>('');
  const [selectedAPI, setSelectedAPI] = useState<ApiProvider>(ApiProvider.DEEPSEEK);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [streamEndTime, setStreamEndTime] = useState<number | null>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const accumulatedTextRef = useRef<string>('');
  const [messageApi, contextHolder] = message.useMessage();
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [errorInfo, setErrorInfo] = useState<string>('');
  const [rawResponse, setRawResponse] = useState<string>('');
  const [showRawResponse, setShowRawResponse] = useState(true);
  const [selectedModel, setSelectedModel] = useState<AIRole>('包包');
  const [rawResponseLines, setRawResponseLines] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleAPIChange = (e: any) => {
    setSelectedAPI(e.target.value);
    // 切换API时清除之前的响应
    setResponse('');
    setResponseId('');
    setRawResponse('');
    setDebugInfo('');
    setErrorInfo('');
  };

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return;
    
    // 清空旧数据
    setResponse('');
    setIsStreaming(true);
    setResponseId('');
    setStreamStartTime(Date.now());
    setStreamEndTime(null);
    accumulatedTextRef.current = '';
    setDebugInfo('');
    setRawResponseLines([]);
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      id: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    // 取消之前的流
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
    }

    // 获取选中的角色对应的API选项
    const selectedOption = API_OPTIONS.find(opt => opt.role === selectedModel);
    if (!selectedOption || !selectedOption.role) {
      messageApi.error('所选AI角色配置无效');
      setIsStreaming(false);
      return;
    }

    // 记录请求信息
    setDebugInfo(`请求开始: 使用${selectedOption.label}为角色${selectedModel}发送请求...\n`);

    // 系统消息
    const systemPrompt = `你是一个流式API测试助手，正在测试${selectedOption.label}的能力。请以Markdown格式友好地回应用户的问题，并展示该API的能力。`;
      
    // 构建消息数组，确保类型正确
    const apiMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => {
        // 确保role只能是system, user或assistant
        const validRole = (m.role === 'user' || m.role === 'assistant' || m.role === 'system') 
          ? m.role as 'user' | 'assistant' | 'system'
          : 'user'; // 默认为user
        return { role: validRole, content: m.content };
      }),
      { role: 'user', content: input }
    ];

    try {
      // 直接使用选中角色调用API
      setDebugInfo(prev => prev + `使用${selectedOption.label} API，角色为${selectedModel}\n`);
      cancelStreamRef.current = apiService.sendRoleBasedStreamRequest(
        selectedModel,
        apiMessages,
        handleStreamChunk,
        handleStreamComplete,
        handleStreamError
      );
      
      // 清空输入
      setInput('');
    } catch (error) {
      console.error('启动流式请求出错:', error);
      setDebugInfo(prev => prev + `启动请求出错: ${error}\n`);
      messageApi.error('启动流式请求出错');
      setIsStreaming(false);
    }
  };

  const handleStreamChunk = (chunk: string, chunkId: string) => {
    if (!responseId && chunkId) {
      setResponseId(chunkId);
      setDebugInfo(prev => prev + `收到响应ID: ${chunkId}\n`);
    }
    
    // 累积内容
    accumulatedTextRef.current += chunk;
    // 更新显示
    setResponse(accumulatedTextRef.current);
    
    // 如果是豆包API，记录原始响应数据
    if (selectedModel === '包包') {
      setRawResponse(prev => `${prev}${chunk}`);
    }
    
    // 记录每10个块的一次
    if (accumulatedTextRef.current.length % 100 === 0) {
      setDebugInfo(prev => prev + `已接收 ${accumulatedTextRef.current.length} 个字符\n`);
    }
  };

  const handleStreamComplete = (fullText: string) => {
    setStreamEndTime(Date.now());
    setIsStreaming(false);
    setDebugInfo(prev => prev + `流式响应完成，共 ${fullText.length} 个字符\n`);
    messageApi.success('流式响应完成');
    
    // 添加AI消息
    setMessages(prev => {
      const tempIndex = prev.findIndex(m => m.id === -1);
      if (tempIndex >= 0) {
        const newMessages = [...prev];
        newMessages[tempIndex] = { ...newMessages[tempIndex], id: Date.now() };
        return newMessages;
      }
      return [...prev, { role: 'assistant', content: fullText, id: Date.now() }];
    });
  };

  const handleStreamError = (error: any) => {
    console.error('Stream error:', error);
    setDebugInfo(prev => prev + `错误: ${error.message || '未知错误'}\n${JSON.stringify(error)}\n`);
    
    // 设置错误信息
    setErrorInfo(
      `错误类型: ${error.name || '未知'}\n` +
      `错误消息: ${error.message || '无消息'}\n` +
      `错误详情: ${JSON.stringify(error.originalError || error, null, 2)}\n` +
      `时间: ${new Date().toLocaleTimeString()}`
    );
    
    setIsStreaming(false);
    messageApi.error(error.message || '流式请求出错');
  };

  const handleCancel = () => {
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
      setIsStreaming(false);
      messageApi.info('已取消响应');
    }
  };

  const getSelectedAPIOption = (): APIOption => {
    return API_OPTIONS.find(option => option.key === selectedAPI) || API_OPTIONS[0];
  };

  // 计算响应时间
  const getResponseTime = () => {
    if (streamStartTime && streamEndTime) {
      return `${((streamEndTime - streamStartTime) / 1000).toFixed(2)}秒`;
    }
    return '计算中...';
  };

  // 计算字符率
  const getCharRate = () => {
    if (streamStartTime && streamEndTime && response) {
      const seconds = (streamEndTime - streamStartTime) / 1000;
      const chars = response.length;
      return `${(chars / seconds).toFixed(2)}字/秒`;
    }
    return '计算中...';
  };

  // 清除输出和状态
  const handleClear = () => {
    setResponse('');
    setResponseId('');
    setStreamStartTime(null);
    setStreamEndTime(null);
    setDebugInfo('');
    setErrorInfo('');
    setRawResponse('');
    setRawResponseLines([]);
    setMessages([]);
    messageApi.info('已清除所有输出');
  };

  // 格式化豆包API原始响应，高亮显示data:前缀
  const formatRawResponse = (raw: string) => {
    if (!raw) return '';
    
    // 为了显示目的，我们把它处理成一行一行的格式
    const formatted = raw.split('').map(char => {
      if (char === '\n') return '<br/>';
      return char;
    }).join('');
    
    return formatted;
  };

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [response, rawResponseLines, messages]);

  // 自定义拦截器，捕获并显示豆包API的原始响应
  useEffect(() => {
    // 拦截fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const [resource, config] = args;
      
      // 检查是否是豆包API请求
      if (typeof resource === 'string' && resource.includes('volces.com/api/v3/chat/completions')) {
        try {
          // 使用原始fetch发送请求
          const response = await originalFetch(resource, config);
          
          // 如果是流式响应并且用户要查看原始响应，且当前选择的是豆包模型
          if (response.body && showRawResponse && selectedModel === '包包') {
            // 创建一个新的Response对象，用于克隆响应流
            const clonedResponse = response.clone();
            
            // 处理克隆的响应流
            const reader = clonedResponse.body!.getReader();
            const decoder = new TextDecoder('utf-8');
            
            // 读取流
            const processStream = async () => {
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  
                  if (done) break;
                  
                  // 解码并添加到原始响应行
                  const chunk = decoder.decode(value, { stream: true });
                  
                  // 将响应分行并添加到状态
                  const lines = chunk.split('\n').filter(line => line.trim());
                  
                  setRawResponseLines(prev => [...prev, ...lines]);
                }
              } catch (err) {
                console.error('读取响应流出错:', err);
              }
            };
            
            // 开始处理流
            processStream();
          }
          
          return response;
        } catch (error) {
          console.error('拦截请求时出错:', error);
          throw error;
        }
      }
      
      // 对于其他请求，使用原始fetch
      return originalFetch(...args);
    };
    
    // 清理函数
    return () => {
      window.fetch = originalFetch;
    };
  }, [showRawResponse, selectedModel]);

  // 添加模型选择逻辑
  const handleModelChange = (value: AIRole) => {
    console.log('选择AI模型:', value);
    setSelectedModel(value);
    // 根据选择的AI角色自动设置对应的API提供商
    const apiOption = API_OPTIONS.find(opt => opt.role === value);
    if (apiOption) {
      setSelectedAPI(apiOption.key);
      console.log('已切换API提供商为:', apiOption.key);
    }
  };

  return (
    <Container>
      {contextHolder}
      <Header>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/')} 
          type="text"
        />
        <StyledTitle level={3}>流式输出测试</StyledTitle>
      </Header>
      
      <ControlsContainer>
        <Select 
          value={selectedModel} 
          onChange={handleModelChange}
          style={{ width: 150 }}
        >
          <Option value="包包">豆包 (包包)</Option>
          <Option value="暗面">暗面</Option>
          <Option value="蓝鲸">蓝鲸</Option>
          <Option value="小元">小元</Option>
        </Select>
        
        <Space>
          <Text>显示原始响应:</Text>
          <Switch 
            checked={showRawResponse} 
            onChange={setShowRawResponse}
          />
        </Space>
      </ControlsContainer>
      
      <InputContainer>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`向${selectedModel}提问...`}
          autoSize={{ minRows: 3, maxRows: 6 }}
          disabled={isStreaming}
          onPressEnter={e => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <Space>
            {isStreaming && (
              <Button danger onClick={handleCancel}>
                取消
              </Button>
            )}
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={isStreaming}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? '接收中...' : '发送'}
            </Button>
            {(response || debugInfo || errorInfo || rawResponse) && (
              <Button onClick={handleClear}>
                清除输出
              </Button>
            )}
          </Space>
        </div>
      </InputContainer>

      <Divider>
        {getSelectedAPIOption().label} 响应（ID: {responseId || '未开始'}）
      </Divider>

      {errorInfo && (
        <StyledCard style={{ border: '1px solid #d9363e', marginTop: '1rem' }}>
          <div style={{ color: '#d9363e', fontWeight: 'bold', marginBottom: '8px' }}>发生错误</div>
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'monospace', 
            fontSize: '13px',
            background: 'rgba(217, 54, 62, 0.1)',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {errorInfo}
          </div>
          <Button 
            danger 
            size="small" 
            style={{ marginTop: '8px' }} 
            onClick={() => setErrorInfo('')}
          >
            清除错误
          </Button>
        </StyledCard>
      )}
      
      {/* 显示豆包API的原始响应 */}
      {showRawResponse && selectedModel === '包包' && rawResponseLines.length > 0 && (
        <RawResponseCard title="豆包API原始响应">
          {rawResponseLines.map((line, index) => (
            <RawResponseLine 
              key={index} 
              isData={line.startsWith('data:')}
            >
              {line}
            </RawResponseLine>
          ))}
        </RawResponseCard>
      )}
      
      <MessagesContainer>
        {messages.map((message, index) => (
          <MessageCard key={index}>
            <Paragraph>
              <strong>{message.role === 'user' ? '用户' : 'AI'}:</strong>
            </Paragraph>
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Paragraph>
          </MessageCard>
        ))}
        {isStreaming && !messages.find(m => m.id === -1) && (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <Spin />
          </div>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      {(response || isStreaming) && (
        <>
          <StatsCard size="small" title="响应统计">
            <p>模型: {getSelectedAPIOption().model}</p>
            <p>字符数: {response.length}</p>
            <p>响应时间: {getResponseTime()}</p>
            <p>速率: {getCharRate()}</p>
          </StatsCard>
          
          {/* 调试信息区域 */}
          {debugInfo && (
            <StatsCard size="small" title="调试信息" style={{ marginTop: '1rem', background: '#1a1a2e' }}>
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                fontFamily: 'monospace', 
                fontSize: '12px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {debugInfo}
              </div>
            </StatsCard>
          )}
        </>
      )}
    </Container>
  );
};

export default StreamTest; 