import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Input, Button, Space, Card, Tooltip } from 'antd';
import { TeamOutlined, BulbOutlined, SendOutlined, SettingOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const HomeContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
  text-align: center;
`;

const StyledCard = styled(Card)`
  width: 100%;
  max-width: 700px;
  background-color: #1e293b;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  margin-top: 2rem;
`;

const InputGroup = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledButton = styled(Button)`
  height: 48px;
  font-size: 16px;
`;

const SettingsLink = styled(Link)`
  margin-top: 2rem;
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.3s;
  
  &:hover {
    color: rgba(255, 255, 255, 0.8);
  }
`;

const Home: React.FC = () => {
  const [topic, setTopic] = useState('');
  const navigate = useNavigate();

  const handleStartDiscussion = () => {
    if (topic.trim()) {
      try {
        console.log('开始讨论，原始topic:', topic);
        
        // 确保URL编码正确
        const encodedTopic = encodeURIComponent(topic.trim());
        console.log('编码后的topic:', encodedTopic);
        
        // 确保生成正确的URL
        const discussionUrl = `/discussion?topic=${encodedTopic}`;
        console.log('生成的讨论URL:', discussionUrl);
        
        // 导航到讨论页面
        navigate(discussionUrl);
      } catch (error) {
        console.error('导航到讨论页面时出错:', error);
        // 简单的错误处理：即使编码失败，也尝试直接使用原始topic
        navigate(`/discussion?topic=${topic}`);
      }
    }
  };

  return (
    <HomeContainer>
      <ContentWrapper>
        <Title level={1} style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          思考与表达
        </Title>
        <Paragraph style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '700px' }}>
          在这里，你可以提出任何关于生活的观察或问题，让AI们在圆桌会议中为你展开深度思考
        </Paragraph>
        
        <Space size={20}>
          <BulbOutlined style={{ fontSize: '24px', color: '#3b82f6' }} />
          <TeamOutlined style={{ fontSize: '24px', color: '#3b82f6' }} />
        </Space>
        
        <StyledCard>
          <Title level={4}>开启一场思想的对话</Title>
          <Paragraph style={{ opacity: 0.7 }}>
            请输入你想探讨的话题或问题，AI们将从不同角度展开讨论
          </Paragraph>
          
          <InputGroup>
            <TextArea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：如何在现代社会保持内心的平静？为什么我们会感到孤独？"
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{ fontSize: '16px' }}
            />
            
            <StyledButton 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleStartDiscussion}
              disabled={!topic.trim()}
              block
            >
              开始讨论
            </StyledButton>
          </InputGroup>
        </StyledCard>
        
        <SettingsLink to="/settings">
          <Space size={5}>
            <SettingOutlined />
            <span>提示词配置</span>
          </Space>
        </SettingsLink>
      </ContentWrapper>
    </HomeContainer>
  );
};

export default Home;