import React, { useState } from 'react';
import { Typography, Avatar, Space } from 'antd';
import styled from 'styled-components';
import { UserOutlined, BulbOutlined, RobotOutlined, CommentOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const { Text } = Typography;

export type AIRole = '蓝鲸' | '蓝鲸总结者' | '小元' | '暗面' | '包包';

interface AIMessageProps {
  role: AIRole;
  content: string;
  type: 'guide' | 'opinion' | 'summary';
  isTyping?: boolean;
}

// 获取AI角色对应的头像和颜色
const getRoleConfig = (role: AIRole, type: string) => {
  switch (role) {
    case '蓝鲸':
      return {
        color: '#3b82f6',
        icon: type === 'guide' ? <UserOutlined /> : <BulbOutlined />,
        bgColor: '#1e40af',
        avatarSrc: process.env.PUBLIC_URL + '/avatars/bluewhale.png'
      };
    case '蓝鲸总结者':
      return {
        color: '#3b82f6',
        icon: <BulbOutlined />,
        bgColor: '#1e40af',
        avatarSrc: process.env.PUBLIC_URL + '/avatars/bluewhale.png'
      };
    case '小元':
      return {
        color: '#06b6d4',
        icon: <RobotOutlined />,
        bgColor: '#0e7490',
        avatarSrc: process.env.PUBLIC_URL + '/avatars/xiaoyuan.png'
      };
    case '暗面':
      return {
        color: '#d946ef',
        icon: <CommentOutlined />,
        bgColor: '#a21caf',
        avatarSrc: process.env.PUBLIC_URL + '/avatars/darkside.png'
      };
    case '包包':
      return {
        color: '#ef4444',
        icon: <RobotOutlined />,
        bgColor: '#b91c1c',
        avatarSrc: process.env.PUBLIC_URL + '/avatars/baobao.png'
      };
    default:
      return {
        color: '#3b82f6',
        icon: <RobotOutlined />,
        bgColor: '#1e40af',
        avatarSrc: ''
      };
  }
};

const MessageContainer = styled.div<{ color: string }>`
  display: flex;
  margin-bottom: 24px;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeIn 0.5s forwards;
  
  @keyframes fadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const StyledAvatar = styled(Avatar)<{ bgcolor: string }>`
  background-color: ${props => props.bgcolor};
`;

const MessageContent = styled.div<{ color: string }>`
  background-color: rgba(30, 41, 59, 0.7);
  border-left: 3px solid ${props => props.color};
  border-radius: 0 8px 8px 0;
  padding: 16px 20px;
  margin-left: 12px;
  flex: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  span {
    background-color: #64748b;
    border-radius: 50%;
    display: inline-block;
    width: 5px;
    height: 5px;
    animation: typing 1.5s infinite ease-in-out;
  }

  span:nth-child(2) {
    animation-delay: 0.2s;
  }

  span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-5px);
    }
  }
`;

// 自定义Markdown样式
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

const AIMessage: React.FC<AIMessageProps> = ({ role, content, type, isTyping }) => {
  const { color, icon, bgColor, avatarSrc } = getRoleConfig(role, type);
  const [imageError, setImageError] = useState(false);
  
  // 添加调试日志
  console.log('AIMessage渲染:', { role, type, avatarSrc, color });
  
  return (
    <MessageContainer color={color}>
      {avatarSrc && !imageError ? (
        <Avatar 
          size={40} 
          src={avatarSrc} 
          style={{ backgroundColor: bgColor }}
          icon={icon} // 作为备用图标，当头像加载失败时显示
          onError={() => {
            console.log('头像加载失败:', avatarSrc);
            setImageError(true);
            return true; // 返回true以防止浏览器默认的错误处理
          }}
        />
      ) : (
        <StyledAvatar size={40} icon={icon} bgcolor={bgColor} />
      )}
      <MessageContent color={color}>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Text strong style={{ color, fontSize: '16px' }}>
            {role}
            {type === 'guide' && ' (引导者)'}
            {type === 'summary' && ' (总结者)'}
          </Text>
          
          {isTyping ? (
            <TypingIndicator>
              <span></span>
              <span></span>
              <span></span>
            </TypingIndicator>
          ) : (
            <MarkdownContent>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {content}
              </ReactMarkdown>
            </MarkdownContent>
          )}
        </Space>
      </MessageContent>
    </MessageContainer>
  );
};

export default AIMessage; 