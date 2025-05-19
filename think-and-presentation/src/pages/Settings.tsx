import React, { useState, useEffect, useRef } from 'react';
import { Typography, Button, Tabs, Input, Space, message, Card, Select, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UndoOutlined, SendOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { SYSTEM_PROMPTS, ApiProvider, sendRoleBasedStreamRequest, Message } from '../services/api';
import { AIRole } from '../components/AIMessage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

const SettingsContainer = styled.div`
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

const StyledCard = styled(Card)`
  margin-bottom: 1.5rem;
  background-color: #1e293b;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  justify-content: flex-end;
`;

// 提示词存储的键名
const PROMPT_STORAGE_KEY = 'ai_custom_prompts';

// 默认提示词映射，增加总结者角色
const DEFAULT_PROMPTS: Record<string, string> = {
  '蓝鲸': SYSTEM_PROMPTS.guide,
  '蓝鲸总结者': SYSTEM_PROMPTS.summary,
  '小元': SYSTEM_PROMPTS.discussant1,
  '暗面': SYSTEM_PROMPTS.discussant2,
  '包包': SYSTEM_PROMPTS.discussant3
};

// 测试提示词组件
const TestPromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ResponseCard = styled(Card)`
  background-color: #1e293b;
  border: 1px solid #3b82f6;
  margin-top: 1rem;
  height: 500px;
  overflow: hidden;
`;

const TestControls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
`;

interface TestPromptProps {
  prompts: Record<string, string>;
}

const TestPrompt: React.FC<TestPromptProps> = ({ prompts }) => {
  const [role, setRole] = useState<AIRole>('蓝鲸');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleTest = () => {
    if (!query.trim()) {
      message.error('请输入测试问题');
      return;
    }
    
    setLoading(true);
    setResponse('');
    
    const messages: Message[] = [
      { role: 'system', content: prompts[role] || SYSTEM_PROMPTS[getSystemPromptKey(role)] },
      { role: 'user', content: query }
    ];
    
    const cancelRequest = sendRoleBasedStreamRequest(
      role,
      messages,
      (chunk) => {
        setResponse(prev => prev + chunk);
      },
      (fullText) => {
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        message.error('测试失败: ' + error.message);
      }
    );
    
    // 返回取消函数（如果需要取消）
    return () => cancelRequest();
  };
  
  // 根据角色获取系统提示词键名
  const getSystemPromptKey = (role: AIRole): keyof typeof SYSTEM_PROMPTS => {
    switch (role) {
      case '蓝鲸': return 'guide';
      case '蓝鲸总结者': return 'summary';
      case '小元': return 'discussant1';
      case '暗面': return 'discussant2';
      case '包包': return 'discussant3';
      default: return 'guide';
    }
  };
  
  // 根据角色获取对应的API
  const getRoleAPIProvider = (role: AIRole): ApiProvider => {
    switch (role) {
      case '蓝鲸': return ApiProvider.DEEPSEEK;
      case '蓝鲸总结者': return ApiProvider.DEEPSEEK;
      case '小元': return ApiProvider.HUNYUAN;
      case '暗面': return ApiProvider.MOONSHOT;
      case '包包': return ApiProvider.DOUBAO;
      default: return ApiProvider.DEEPSEEK;
    }
  };
  
  return (
    <TestPromptContainer>
      <StyledCard>
        <Paragraph>
          在此处测试提示词效果。选择一个AI角色，输入测试问题，系统将使用当前编辑的提示词生成回复。
        </Paragraph>
        
        <TestControls>
          <Select 
            value={role} 
            onChange={setRole} 
            style={{ width: 150 }}
          >
            <Option value="蓝鲸">蓝鲸 (引导者)</Option>
            <Option value="蓝鲸总结者">蓝鲸 (总结者)</Option>
            <Option value="小元">小元 (讨论者1)</Option>
            <Option value="暗面">暗面 (讨论者2)</Option>
            <Option value="包包">包包 (讨论者3)</Option>
          </Select>
          
          <Text type="secondary">使用API: {getRoleAPIProvider(role)}</Text>
        </TestControls>
        
        <TextArea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入测试问题，例如：如何在现代社会保持内心的平静？"
          autoSize={{ minRows: 3, maxRows: 6 }}
        />
        
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleTest}
          loading={loading}
          style={{ marginTop: '1rem' }}
        >
          开始测试
        </Button>
      </StyledCard>
      
      {(loading || response) && (
        <ResponseCard title="响应结果">
          {loading && <Spin />}
          <div style={{ whiteSpace: 'pre-wrap' }}>{response}</div>
        </ResponseCard>
      )}
    </TestPromptContainer>
  );
};

// 响应区域的Markdown样式
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

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const testInputRef = useRef<any>(null);
  const responseContainerRef = useRef<HTMLDivElement>(null);
  const testCardRef = useRef<HTMLDivElement>(null);
  const responseResultRef = useRef<HTMLDivElement>(null);
  
  // 各角色的提示词，增加总结者
  const [prompts, setPrompts] = useState<Record<string, string>>({
    '蓝鲸': '',
    '蓝鲸总结者': '',
    '小元': '',
    '暗面': '',
    '包包': ''
  });
  
  // 是否已修改
  const [isDirty, setIsDirty] = useState(false);
  
  // 当前正在测试的角色和状态
  const [testingRole, setTestingRole] = useState<AIRole | null>(null);
  const [testQuery, setTestQuery] = useState<string>('');
  const [testResponse, setTestResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // 加载已保存的提示词
  useEffect(() => {
    try {
      const savedPrompts = localStorage.getItem(PROMPT_STORAGE_KEY);
      if (savedPrompts) {
        const parsedPrompts = JSON.parse(savedPrompts);
        
        // 确保包含总结者提示词
        const updatedPrompts = {
          ...DEFAULT_PROMPTS, // 首先应用默认提示词
          ...parsedPrompts    // 然后用保存的提示词覆盖
        };
        
        // 如果没有总结者提示词，添加默认值
        if (!parsedPrompts['蓝鲸总结者']) {
          updatedPrompts['蓝鲸总结者'] = DEFAULT_PROMPTS['蓝鲸总结者'];
        }
        
        setPrompts(updatedPrompts);
      } else {
        // 没有保存的提示词，使用默认值
        setPrompts(DEFAULT_PROMPTS);
      }
    } catch (error) {
      console.error('加载提示词出错:', error);
      setPrompts(DEFAULT_PROMPTS);
    }
  }, []);
  
  // 处理提示词变更
  const handlePromptChange = (role: string, value: string) => {
    setPrompts(prev => ({
      ...prev,
      [role]: value
    }));
    setIsDirty(true);
  };
  
  // 重置为系统默认提示词
  const handleReset = (role: string) => {
    setPrompts(prev => ({
      ...prev,
      [role]: DEFAULT_PROMPTS[role]
    }));
    setIsDirty(true);
    messageApi.success(`已重置${role}的提示词为系统默认值`);
  };
  
  // 保存所有提示词
  const handleSaveAll = () => {
    try {
      localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(prompts));
      setIsDirty(false);
      messageApi.success('所有提示词已保存');
    } catch (error) {
      console.error('保存提示词出错:', error);
      messageApi.error('保存提示词失败');
    }
  };
  
  // 返回首页
  const handleBack = () => {
    if (isDirty) {
      if (window.confirm('你有未保存的更改，确定要离开吗？')) {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  // 修改单个角色的提示词测试函数
  const handleTest = (role: AIRole) => {
    setTestingRole(role);
    setTestQuery('');
    setTestResponse('');
    
    // 等待DOM更新后聚焦到输入框并滚动到合适位置
    requestAnimationFrame(() => {
      if (testInputRef.current) {
        testInputRef.current.focus();
      }
      
      if (testCardRef.current) {
        const yOffset = -100; // 向上偏移100px，给输入框留出空间
        const y = testCardRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  };
  
  // 修改测试执行函数
  const handleRunTest = () => {
    if (!testingRole || !testQuery.trim()) {
      message.error('请输入测试问题');
      return;
    }
    
    setIsLoading(true);
    setTestResponse('');
    
    // 确保响应结果区域在视图中
    requestAnimationFrame(() => {
      if (responseResultRef.current) {
        // 计算响应结果区域的位置
        const rect = responseResultRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset + rect.top - 20; // 向上偏移20px，留出一点空间
        
        // 平滑滚动到响应结果区域
        window.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    });
    
    const messages: Message[] = [
      { role: 'system', content: prompts[testingRole] || SYSTEM_PROMPTS[getSystemPromptKey(testingRole)] },
      { role: 'user', content: testQuery }
    ];
    
    const cancelRequest = sendRoleBasedStreamRequest(
      testingRole,
      messages,
      (chunk) => {
        setTestResponse(prev => prev + chunk);
        // 使用 requestAnimationFrame 确保在下一帧渲染后滚动
        requestAnimationFrame(scrollToLatestContent);
      },
      (fullText) => {
        setIsLoading(false);
        // 最后一次滚动
        requestAnimationFrame(scrollToLatestContent);
      },
      (error) => {
        setIsLoading(false);
        message.error('测试失败: ' + error.message);
      }
    );
  };

  // 滚动到最新内容的函数，便于复用
  const scrollToLatestContent = () => {
    if (responseContainerRef.current) {
      const element = responseContainerRef.current;
      element.scrollTop = element.scrollHeight;
    }
  };

  // 当测试角色变化或有响应内容时，确保测试框在视野内
  useEffect(() => {
    if (testingRole && testCardRef.current) {
      setTimeout(() => {
        testCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [testingRole]);

  // 当响应内容变化时，确保滚动到最新内容
  useEffect(() => {
    if (testResponse) {
      scrollToLatestContent();
    }
  }, [testResponse]);

  // 关闭测试
  const handleCloseTest = () => {
    setTestingRole(null);
  };

  // 根据角色获取系统提示词键名
  const getSystemPromptKey = (role: AIRole): keyof typeof SYSTEM_PROMPTS => {
    switch (role) {
      case '蓝鲸': return 'guide';
      case '蓝鲸总结者': return 'summary';
      case '小元': return 'discussant1';
      case '暗面': return 'discussant2';
      case '包包': return 'discussant3';
      default: return 'guide';
    }
  };

  return (
    <SettingsContainer>
      {contextHolder}
      <Header>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack} 
          type="text"
        />
        <StyledTitle level={3}>提示词配置</StyledTitle>
      </Header>
      
      <Paragraph>
        在这里您可以为每个AI角色配置自定义的提示词，影响它们的语言风格和思维方式。
        如果没有设置自定义提示词，系统将使用默认提示词。
      </Paragraph>
      
      <Tabs defaultActiveKey="蓝鲸">
        <TabPane tab="蓝鲸 (引导者)" key="蓝鲸">
          <StyledCard>
            <Paragraph>蓝鲸作为讨论引导者，负责开启讨论。</Paragraph>
            <TextArea
              value={prompts['蓝鲸']}
              onChange={(e) => handlePromptChange('蓝鲸', e.target.value)}
              placeholder="输入蓝鲸的提示词..."
              autoSize={{ minRows: 10, maxRows: 20 }}
            />
            <ButtonsContainer>
              <Button 
                icon={<SendOutlined />} 
                onClick={() => handleTest('蓝鲸')}
                type="primary"
              >
                测试提示词
              </Button>
              <Button 
                icon={<UndoOutlined />} 
                onClick={() => handleReset('蓝鲸')}
              >
                重置为默认
              </Button>
            </ButtonsContainer>
          </StyledCard>
        </TabPane>
        
        <TabPane tab="蓝鲸 (总结者)" key="蓝鲸总结者">
          <StyledCard>
            <Paragraph>蓝鲸作为讨论总结者，负责总结所有观点并提供整合的视角。</Paragraph>
            <TextArea
              value={prompts['蓝鲸总结者']}
              onChange={(e) => handlePromptChange('蓝鲸总结者', e.target.value)}
              placeholder="输入蓝鲸总结者的提示词..."
              autoSize={{ minRows: 10, maxRows: 20 }}
            />
            <ButtonsContainer>
              <Button 
                icon={<SendOutlined />} 
                onClick={() => handleTest('蓝鲸总结者')}
                type="primary"
              >
                测试提示词
              </Button>
              <Button 
                icon={<UndoOutlined />} 
                onClick={() => handleReset('蓝鲸总结者')}
              >
                重置为默认
              </Button>
            </ButtonsContainer>
          </StyledCard>
        </TabPane>
        
        <TabPane tab="小元 (讨论者1)" key="小元">
          <StyledCard>
            <Paragraph>小元是第一位讨论者，通常带来创新和突破性的思考。</Paragraph>
            <TextArea
              value={prompts['小元']}
              onChange={(e) => handlePromptChange('小元', e.target.value)}
              placeholder="输入小元的提示词..."
              autoSize={{ minRows: 10, maxRows: 20 }}
            />
            <ButtonsContainer>
              <Button 
                icon={<SendOutlined />} 
                onClick={() => handleTest('小元')}
                type="primary"
              >
                测试提示词
              </Button>
              <Button 
                icon={<UndoOutlined />} 
                onClick={() => handleReset('小元')}
              >
                重置为默认
              </Button>
            </ButtonsContainer>
          </StyledCard>
        </TabPane>
        
        <TabPane tab="暗面 (讨论者2)" key="暗面">
          <StyledCard>
            <Paragraph>暗面是第二位讨论者，擅长理性和深度分析。</Paragraph>
            <TextArea
              value={prompts['暗面']}
              onChange={(e) => handlePromptChange('暗面', e.target.value)}
              placeholder="输入暗面的提示词..."
              autoSize={{ minRows: 10, maxRows: 20 }}
            />
            <ButtonsContainer>
              <Button 
                icon={<SendOutlined />} 
                onClick={() => handleTest('暗面')}
                type="primary"
              >
                测试提示词
              </Button>
              <Button 
                icon={<UndoOutlined />} 
                onClick={() => handleReset('暗面')}
              >
                重置为默认
              </Button>
            </ButtonsContainer>
          </StyledCard>
        </TabPane>
        
        <TabPane tab="包包 (讨论者3)" key="包包">
          <StyledCard>
            <Paragraph>包包是第三位讨论者，善于从情感和人文角度思考问题。</Paragraph>
            <TextArea
              value={prompts['包包']}
              onChange={(e) => handlePromptChange('包包', e.target.value)}
              placeholder="输入包包的提示词..."
              autoSize={{ minRows: 10, maxRows: 20 }}
            />
            <ButtonsContainer>
              <Button 
                icon={<SendOutlined />} 
                onClick={() => handleTest('包包')}
                type="primary"
              >
                测试提示词
              </Button>
              <Button 
                icon={<UndoOutlined />} 
                onClick={() => handleReset('包包')}
              >
                重置为默认
              </Button>
            </ButtonsContainer>
          </StyledCard>
        </TabPane>
        
        <TabPane tab="提示词调试" key="test">
          <TestPrompt prompts={prompts} />
        </TabPane>
      </Tabs>
      
      {testingRole && (
        <StyledCard ref={testCardRef} style={{ marginTop: '20px' }}>
          <Typography.Title level={4}>{testingRole} 提示词测试</Typography.Title>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <TextArea
              ref={testInputRef}
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="输入测试问题，例如：如何在现代社会保持内心的平静？"
              autoSize={{ minRows: 3, maxRows: 6 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleRunTest();
                }
              }}
            />
            
            <Space>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleRunTest}
                loading={isLoading}
              >
                开始测试
              </Button>
              
              <Button onClick={handleCloseTest}>
                关闭测试
              </Button>
            </Space>
            
            {(isLoading || testResponse) && (
              <ResponseCard 
                title="响应结果" 
                bodyStyle={{ 
                  height: 'calc(100% - 57px)',
                  overflow: 'hidden',
                  padding: '16px'
                }}
                ref={responseResultRef}
              >
                {isLoading && <Spin />}
                <div 
                  style={{ 
                    height: '100%',
                    overflowY: 'auto',
                    paddingRight: '8px'
                  }}
                  ref={responseContainerRef}
                >
                  <MarkdownContent>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {testResponse}
                    </ReactMarkdown>
                  </MarkdownContent>
                </div>
              </ResponseCard>
            )}
          </Space>
        </StyledCard>
      )}
      
      <Space style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSaveAll}
          disabled={!isDirty}
        >
          保存所有提示词
        </Button>
        <Button onClick={handleBack}>
          返回首页
        </Button>
      </Space>
    </SettingsContainer>
  );
};

export default Settings; 