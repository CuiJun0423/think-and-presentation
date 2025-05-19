import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Typography, Button, Space, Divider, message } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import html2canvas from 'html2canvas';
import AIMessage, { AIRole } from '../components/AIMessage';
import { DialogContext } from '../services/api';

const { Title, Paragraph } = Typography;

const ShareContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
`;

const StyledTitle = styled(Title)`
  margin: 0 !important;
  font-weight: 600 !important;
`;

const TopicCard = styled.div`
  background-color: #1e293b;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const BackButton = styled(Button)`
  margin-right: 1rem;
`;

const MessagesList = styled.div`
  margin-top: 2rem;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 3rem;
  margin-bottom: 2rem;
`;

const DiscussionContent = styled.div`
  background-color: #1e293b;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  overflow: hidden; /* 确保内容不溢出 */
  
  img {
    max-width: 100%; /* 确保图片不超出容器 */
  }
`;

// 用于导出图片的特定样式容器
const ExportContainer = styled.div`
  width: 100%;
  background-color: #0f172a;
  padding: 0;
  margin: 0;
  position: relative;
  
  /* 避免一些可能影响渲染的CSS */
  * {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  img {
    max-width: 100%;
  }
`;

const Footer = styled.div`
  text-align: center;
  margin-top: 2rem;
  opacity: 0.7;
  font-size: 14px;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  text-align: center;
  padding: 1rem;
  margin: 1rem 0;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
`;

interface Message {
  id: number;
  role: AIRole;
  content: string;
  type: 'guide' | 'opinion' | 'summary';
}

// AI角色映射关系
const ROLE_TYPES = {
  guide: {
    role: '蓝鲸',
    type: 'guide'
  },
  discussant1: {
    role: '小元',
    type: 'opinion'
  },
  discussant2: {
    role: '暗面',
    type: 'opinion'
  },
  discussant3: {
    role: '包包',
    type: 'opinion'
  },
  summary: {
    role: '蓝鲸',
    type: 'summary'
  }
};

// 模拟AI角色的回复内容 - 仅作为备用
const mockResponses: Record<AIRole, string[]> = {
  '蓝鲸': [
    '欢迎来到今天的思考与表达环节。我是蓝鲸，这个圆桌讨论的引导者。今天我们将围绕这个话题展开讨论，希望能给你带来一些新的思考角度。',
    '非常感谢大家今天的分享。通过这次讨论，我们看到了这个问题的多个维度。每一种观点都有其独特的价值，帮助我们更全面地理解这个话题。希望这次的思考与表达能给你带来一些启发，让我们在下次讨论中再见。'
  ],
  '蓝鲸总结者': [
    '作为总结者，我想提炼出今天讨论的核心观点。通过多角度思考，我们能够对这个问题有更全面的理解，从而做出更明智的判断和选择。'
  ],
  '小元': [
    '从实用主义的角度来看，这个问题涉及到我们如何在日常生活中做出选择和行动。我认为，重要的是找到平衡点，既要考虑眼前的实际需求，也要放眼长远发展。',
  ],
  '暗面': [
    '从情感和人文的视角来思考这个问题，我们不能忽视内心感受的重要性。每个人都有独特的情感体验和价值追求，这些都应该被尊重和理解。',
  ],
  '包包': [
    '从批判性思维的角度来看，这个问题可能隐含了一些我们没有质疑的假设。我们需要跳出常规思路，重新审视问题的本质，才能找到更深层次的答案。',
  ]
};

const Share: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [topic, setTopic] = useState<string>('');
  const [discussionId, setDiscussionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const topicParam = searchParams.get('topic');
    const idParam = searchParams.get('id');
    const dialogDataParam = searchParams.get('data');
    
    if (!topicParam || !idParam) {
      navigate('/');
      return;
    }
    
    setTopic(decodeURIComponent(topicParam));
    setDiscussionId(idParam);
    
    // 尝试解析对话数据
    if (dialogDataParam) {
      try {
        const dialogContext: DialogContext = JSON.parse(decodeURIComponent(dialogDataParam));
        generateMessagesFromContext(dialogContext);
      } catch (err) {
        console.error('Failed to parse dialog data:', err);
        setError('无法加载讨论内容，将显示示例对话');
        generateMockMessages();
      }
    } else {
      // 如果没有对话数据，使用模拟数据
      generateMockMessages();
    }
  }, [location, navigate]);

  // 从对话上下文生成消息列表
  const generateMessagesFromContext = (dialogContext: DialogContext) => {
    const newMessages: Message[] = [];
    
    // 添加引导者消息
    if (dialogContext.content_0) {
      newMessages.push({
        id: 1,
        role: '蓝鲸',
        content: dialogContext.content_0,
        type: 'guide'
      });
    }
    
    // 添加讨论者1消息
    if (dialogContext.content_1) {
      newMessages.push({
        id: 2,
        role: '小元',
        content: dialogContext.content_1,
        type: 'opinion'
      });
    }
    
    // 添加讨论者2消息
    if (dialogContext.content_2) {
      newMessages.push({
        id: 3,
        role: '暗面',
        content: dialogContext.content_2,
        type: 'opinion'
      });
    }
    
    // 添加讨论者3消息
    if (dialogContext.content_3) {
      newMessages.push({
        id: 4,
        role: '包包',
        content: dialogContext.content_3,
        type: 'opinion'
      });
    }
    
    // 添加总结者消息
    if (dialogContext.content_4) {
      newMessages.push({
        id: 5,
        role: '蓝鲸',
        content: dialogContext.content_4,
        type: 'summary'
      });
    }
    
    setMessages(newMessages);
  };

  // 生成模拟消息（仅当没有实际对话数据时使用）
  const generateMockMessages = () => {
    const speakers: AIRole[] = ['小元', '暗面', '包包'];
    const shuffledSpeakers = speakers.sort(() => Math.random() - 0.5);
    
    // 创建消息列表
    const messagesList: Message[] = [
      {
        id: 1,
        role: '蓝鲸',
        content: mockResponses['蓝鲸'][0],
        type: 'guide'
      }
    ];
    
    // 添加AI发言
    shuffledSpeakers.forEach((role, index) => {
      messagesList.push({
        id: index + 2,
        role,
        content: mockResponses[role][0],
        type: 'opinion'
      });
    });
    
    // 添加总结发言
    messagesList.push({
      id: messagesList.length + 1,
      role: '蓝鲸',
      content: mockResponses['蓝鲸'][1],
      type: 'summary'
    });
    
    setMessages(messagesList);
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleSaveImage = async () => {
    if (!contentRef.current) {
      messageApi.error({ content: '无法找到要保存的内容', key: 'saving' });
      console.error('无法找到要保存的内容:', contentRef.current);
      return;
    }
    
    try {
      messageApi.loading({ content: '正在生成图片...', key: 'saving', duration: 0 });
      console.log('开始生成图片，内容元素:', contentRef.current);
      
      // 确保内容完全渲染
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const options = {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: true,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element: Element) => {
          // 排除可能导致问题的元素
          return element.tagName === 'BUTTON';
        }
      };
      
      console.log('html2canvas配置:', options);
      
      // 尝试获取元素的宽高
      const { offsetWidth, offsetHeight } = contentRef.current;
      console.log('内容尺寸:', { width: offsetWidth, height: offsetHeight });
      
      // 执行渲染
      try {
        const canvas = await html2canvas(contentRef.current, options);
        console.log('Canvas生成成功, 尺寸:', { width: canvas.width, height: canvas.height });
        
        const dataUrl = canvas.toDataURL('image/png');
        // 使用兼容多浏览器的下载方法
        downloadImage(dataUrl, `思考与表达-${topic.substring(0, 20)}.png`);
        
        messageApi.success({ content: '图片已保存', key: 'saving' });
      } catch (canvasError) {
        console.error('Canvas渲染失败:', canvasError);
        messageApi.error({ content: '图片生成失败', key: 'saving' });
        
        // 尝试备用方法
        try {
          // 使用更简单的选项重试
          const simpleOptions = {
            backgroundColor: '#0f172a',
            scale: 1,
            logging: true,
            useCORS: true,
            allowTaint: true
          };
          
          const canvas = await html2canvas(contentRef.current, simpleOptions);
          const dataUrl = canvas.toDataURL('image/png');
          // 使用兼容多浏览器的下载方法
          downloadImage(dataUrl, `思考与表达-${topic.substring(0, 20)}.png`);
          
          messageApi.success({ content: '图片已保存(备用方式)', key: 'saving' });
        } catch (fallbackError) {
          console.error('备用方式也失败了:', fallbackError);
          messageApi.error({ content: '所有图片生成方式均失败，请联系开发者', key: 'saving' });
        }
      }
    } catch (err) {
      console.error('保存图片过程中发生异常:', err);
      messageApi.error({ content: '保存图片失败', key: 'saving' });
    }
  };
  
  // 兼容多浏览器的图片下载方法
  const downloadImage = (dataUrl: string, filename: string) => {
    // 方法1: 创建链接并点击
    try {
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('下载方法1失败:', e);
      
      // 方法2: 使用Blob对象
      try {
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理Blob URL
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 100);
      } catch (e2) {
        console.error('下载方法2也失败:', e2);
        messageApi.info({
          content: '自动下载失败，请右键点击图片并选择"图片另存为"',
          duration: 10
        });
        
        // 方法3: 在新窗口中打开图片，用户可以右键保存
        window.open(dataUrl, '_blank');
      }
    }
  };

  return (
    <ShareContainer>
      {contextHolder}
      <Header>
        <BackButton type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} />
        <StyledTitle level={3}>讨论分享</StyledTitle>
      </Header>
      
      <ExportContainer ref={contentRef}>
        <DiscussionContent>
          <TopicCard>
            <Typography.Title level={4} style={{ margin: 0, color: '#f1f5f9' }}>
              {topic}
            </Typography.Title>
          </TopicCard>
          
          <MessagesList>
            {messages.map((message, index) => (
              <AIMessage 
                key={message.id}
                role={message.role}
                content={message.content}
                type={message.type}
              />
            ))}
          </MessagesList>
        </DiscussionContent>
        
        <Footer>
          思考与表达 - 由AI驱动的多角度思考
        </Footer>
      </ExportContainer>
      
      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
      
      <ActionButtons>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleSaveImage}
        >
          保存为图片
        </Button>
      </ActionButtons>
    </ShareContainer>
  );
};

export default Share; 