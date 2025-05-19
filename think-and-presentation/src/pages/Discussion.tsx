import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Typography, Button, Spin, Space, Divider, message, Alert } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, ShareAltOutlined, SyncOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import AIMessage, { AIRole } from '../components/AIMessage';
import * as apiService from '../services/api';
import { DialogContext } from '../services/api';

const { Title, Paragraph } = Typography;

const DiscussionContainer = styled.div`
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
  scroll-behavior: smooth;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 3rem;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  text-align: center;
  padding: 1rem;
  margin: 1rem 0;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
`;

// 添加讨论进度展示组件
const DiscussionProgress = styled.div<{ isSticky: boolean }>`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${props => props.isSticky ? '0' : '1rem'};
  padding: 0.5rem;
  background-color: rgba(51, 65, 85, 0.3);
  border-radius: 8px;
  transition: all 0.3s ease;
  z-index: 100;
  width: 100%;
  max-width: 900px;
  
  ${props => props.isSticky && `
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 0 0 8px 8px;
    margin: 0 auto;
    padding: 0.5rem 1.5rem;
    backdrop-filter: blur(8px);
    background-color: rgba(15, 23, 42, 0.85);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  `}
`;

// 用于保持内容布局的容器，防止固定定位导致的跳动
const ProgressContainer = styled.div<{ isSticky: boolean }>`
  width: 100%;
  height: ${props => props.isSticky ? '45px' : 'auto'};
  margin-bottom: ${props => props.isSticky ? '1rem' : '0'};
`;

const ProgressStep = styled.div<{ active: boolean; completed: boolean; error: boolean; clickable: boolean }>`
  flex: 1;
  text-align: center;
  padding: 0.5rem;
  margin: 0 0.25rem;
  border-radius: 4px;
  font-size: 0.85rem;
  background-color: ${props => 
    props.error ? 'rgba(220, 38, 38, 0.2)' : 
    props.active ? 'rgba(59, 130, 246, 0.2)' : 
    props.completed ? 'rgba(16, 185, 129, 0.2)' : 
    'rgba(51, 65, 85, 0.5)'
  };
  color: ${props => 
    props.error ? '#ef4444' : 
    props.active ? '#3b82f6' : 
    props.completed ? '#10b981' : 
    '#94a3b8'
  };
  border: 1px solid ${props => 
    props.error ? '#ef4444' : 
    props.active ? '#3b82f6' : 
    props.completed ? '#10b981' : 
    'transparent'
  };
  transition: all 0.3s ease;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  
  &:hover {
    transform: ${props => props.clickable ? 'translateY(-2px)' : 'none'};
    box-shadow: ${props => props.clickable ? '0 2px 5px rgba(0, 0, 0, 0.2)' : 'none'};
  }
`;

interface Message {
  id: number;
  responseId: string;
  role: AIRole;
  content: string;
  type: 'guide' | 'opinion' | 'summary';
}

// AI角色映射
const AI_ROLES: Record<number, AIRole> = {
  0: '蓝鲸', // 引导者
  1: '小元',
  2: '暗面',
  3: '包包',
  4: '蓝鲸'  // 总结者
};

// 简化流程状态类型
interface FlowState {
  currentStep: number;   // 当前正在执行的步骤: -1=未开始, 0=引导, 1-3=讨论者, 4=总结, 5=完成
  isProcessing: boolean; // 当前是否有正在处理的请求
}

const Discussion: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [topic, setTopic] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<AIRole | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // 跟踪已经发言过的角色
  const [spokenRoles, setSpokenRoles] = useState<Set<AIRole>>(new Set());
  // 记录对话上下文
  const [dialogContext, setDialogContext] = useState<DialogContext>({ user_q: '' });
  // 直接引用对话上下文，避免状态更新延迟问题
  const dialogContextRef = useRef<DialogContext>({ user_q: '' });
  // 错误状态
  const [error, setError] = useState<string | null>(null);
  // 发言顺序
  const [speakerOrder, setSpeakerOrder] = useState<AIRole[]>([]);
  // 用于存储取消流式请求的函数
  const cancelStreamRef = useRef<(() => void) | null>(null);
  // 当前响应ID
  const currentResponseIdRef = useRef<string>('');
  // 请求状态
  const [requestStatus, setRequestStatus] = useState<{
    speakerIndex?: number;
    isRetrying: boolean;
    canRetry: boolean;
  }>({
    isRetrying: false,
    canRetry: false
  });
  // 引用最后一条消息，用于自动滚动
  const lastMessageRef = useRef<HTMLDivElement>(null);
  
  // 简化的流程状态
  const [flowState, setFlowState] = useState<FlowState>({
    currentStep: -1,
    isProcessing: false
  });
  
  // 添加flowStateRef用于实时访问最新状态
  const flowStateRef = useRef<FlowState>({
    currentStep: -1,
    isProcessing: false
  });
  
  // 同步更新flowState状态和ref
  const updateFlowState = (newState: FlowState | ((prev: FlowState) => FlowState)) => {
    if (typeof newState === 'function') {
      // 如果是函数，先处理，然后更新
      const updaterFn = newState as (prev: FlowState) => FlowState;
      setFlowState(prev => {
        const nextState = updaterFn(prev);
        flowStateRef.current = nextState;
        console.log('已通过函数更新flowState和ref:', nextState);
        return nextState;
      });
    } else {
      // 直接更新
      setFlowState(newState);
      flowStateRef.current = newState;
      console.log('已直接更新flowState和ref:', newState);
    }
  };

  // 添加防止重复调用的标志
  const [stepInProgress, setStepInProgress] = useState<Record<number, boolean>>({
    0: false, 1: false, 2: false, 3: false, 4: false
  });
  
  // 同步更新dialogContext状态和ref
  const updateDialogContext = (newContext: DialogContext) => {
    setDialogContext(newContext);
    dialogContextRef.current = newContext;
    console.log('已更新dialogContext和ref:', newContext);
  };

  // 添加是否固定导航的状态
  const [isProgressSticky, setIsProgressSticky] = useState(false);
  
  // 创建每个发言部分的引用
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  
  // 添加进度条容器的引用，用于计算位置
  const progressRef = useRef<HTMLDivElement>(null);
  
  // 从URL参数中获取topic
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const topicParam = searchParams.get('topic');
      
      console.log('获取到原始topic参数:', topicParam);
      
      if (!topicParam) {
        console.error('URL中没有找到topic参数');
        setError('未找到讨论主题，请返回首页重新开始');
        setIsLoading(false);
        return;
      }
      
      // 尝试多种解码方式确保获取正确的topic
      let decodedTopic: string = '';
      try {
        // 正常解码一次
        decodedTopic = decodeURIComponent(topicParam);
        console.log('一次解码结果:', decodedTopic);
        
        // 检查是否需要二次解码（有时URL可能被多次编码）
        if (decodedTopic.includes('%')) {
          const doubleDecodedTopic = decodeURIComponent(decodedTopic);
          console.log('二次解码结果:', doubleDecodedTopic);
          // 如果二次解码后内容变化，则使用二次解码结果
          if (doubleDecodedTopic !== decodedTopic) {
            decodedTopic = doubleDecodedTopic;
          }
        }
      } catch (decodeError) {
        console.error('解码topic参数出错:', decodeError);
        // 解码失败时使用原始参数
        decodedTopic = topicParam;
      }
      
      // 确保解码后的topic不为空
      if (!decodedTopic || decodedTopic.trim() === '') {
        console.error('解码后的topic为空');
        setError('讨论主题不能为空，请返回首页重新输入');
        setIsLoading(false);
        return;
      }
      
      console.log('最终解码后的议题:', decodedTopic);
      
      // 直接设置topic和dialogContext
      setTopic(decodedTopic);
      
      // 确保user_q被正确设置
      const initialContext = { user_q: decodedTopic };
      updateDialogContext(initialContext);
      
      // 重新验证设置是否成功
      setTimeout(() => {
        console.log('验证topic是否成功设置:', {
          topic,
          dialogContext,
          dialogContextRef: dialogContextRef.current
        });
      }, 100);
      
      setIsLoading(false);
      
      // 设置固定的AI发言顺序
      setSpeakerOrder(['蓝鲸', '小元', '暗面', '包包', '蓝鲸']);
      
      // 开始讨论 - 使用延迟确保组件已完全挂载和状态已更新
      const timer = setTimeout(() => {
        console.log('初始化完成，开始讨论，当前topic:', decodedTopic);
        console.log('当前dialogContextRef:', dialogContextRef.current);
        
        // 再次验证topic是否有效
        if (!dialogContextRef.current.user_q || dialogContextRef.current.user_q.trim() === '') {
          console.error('启动讨论前发现user_q为空');
          setError('讨论主题未能正确设置，请刷新页面重试');
          return;
        }
        
        startDiscussion();
      }, 2000); // 增加延迟确保状态完全更新

      // 组件卸载时取消所有进行中的流式请求
      return () => {
        clearTimeout(timer);
        if (cancelStreamRef.current) {
          cancelStreamRef.current();
        }
      };
    } catch (err) {
      console.error('处理URL参数出错:', err);
      setError('初始化讨论时出错，请返回首页重试');
      setIsLoading(false);
    }
  }, [location, navigate]);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      // 如果进度条引用存在
      if (progressRef.current) {
        const rect = progressRef.current.getBoundingClientRect();
        const isSticky = rect.top <= 0;
        setIsProgressSticky(isSticky);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // 滚动到指定部分
  const scrollToSection = (index: number) => {
    // 只有当内容已加载完毕，且该部分已渲染，才执行滚动
    if (!isLoading && sectionRefs.current[index]) {
      // 计算滚动偏移量，考虑固定导航栏的高度
      const offset = isProgressSticky ? -50 : 0;
      const element = sectionRefs.current[index];
      if (element) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: elementPosition + offset,
          behavior: 'smooth'
        });
      }
    }
  };

  // 添加或更新消息
  const addOrUpdateMessage = (role: AIRole, content: string, type: 'guide' | 'opinion' | 'summary', responseId: string) => {
    // 如果有相同responseId的消息，则更新该消息
    setMessages(prev => {
      const existingMessageIndex = prev.findIndex(msg => msg.responseId === responseId);
      
      if (existingMessageIndex >= 0) {
        // 更新现有消息
        const updatedMessages = [...prev];
        updatedMessages[existingMessageIndex] = {
          ...updatedMessages[existingMessageIndex],
          content: content
        };
        return updatedMessages;
      } else {
        // 创建新消息
        if (type !== 'summary') {
          setSpokenRoles(prevRoles => new Set(prevRoles).add(role));
        }
        
        return [...prev, {
          id: Date.now(),
          responseId,
          role,
          content,
          type
        }];
      }
    });
    
    // 滚动到最新消息
    setTimeout(() => {
      if (lastMessageRef.current) {
        lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  };

  // 开始讨论
  const startDiscussion = async () => {
    try {
      console.log('开始讨论流程，当前topic:', topic);
      
      // 清除旧状态
      setMessages([]);
      setIsComplete(false);
      setSpokenRoles(new Set());
      setError(null);
      currentResponseIdRef.current = '';
      
      // 重置防重复调用标志
      setStepInProgress({
        0: false, 1: false, 2: false, 3: false, 4: false
      });
      
      // 增强topic验证逻辑
      let userQuery = '';
      
      // 首先尝试从dialogContext获取
      if (dialogContextRef.current && dialogContextRef.current.user_q && dialogContextRef.current.user_q.trim() !== '') {
        userQuery = dialogContextRef.current.user_q;
        console.log('从dialogContextRef获取到有效的user_q:', userQuery);
      } 
      // 然后尝试从topic状态获取
      else if (topic && topic.trim() !== '') {
        userQuery = topic.trim();
        console.log('dialogContextRef中user_q无效，从topic状态获取:', userQuery);
      }
      
      // 最终验证
      if (!userQuery) {
        console.error('无法获取有效的讨论主题，所有来源都为空');
        setError('讨论主题不能为空，请返回首页重新输入');
        return;
      }
      
      // 重置讨论上下文，确保user_q被正确设置
      const newDialogContext: DialogContext = { user_q: userQuery };
      updateDialogContext(newDialogContext);
      
      // 确保topic状态也是正确的
      if (topic !== userQuery) {
        console.log('更新topic状态以匹配user_q:', userQuery);
        setTopic(userQuery);
      }
      
      // 重置流程状态
      updateFlowState({
        currentStep: -1,
        isProcessing: false
      });
      
      setRequestStatus({
        isRetrying: false,
        canRetry: false
      });
      
      // 再次验证dialogContext是否正确更新
      setTimeout(() => {
        if (!dialogContextRef.current || !dialogContextRef.current.user_q || dialogContextRef.current.user_q.trim() === '') {
          console.error('设置dialogContext失败，user_q仍然为空');
          setError('初始化讨论失败，请刷新页面重试');
          return;
        }
        
        console.log('准备开始引导阶段，当前dialogContext:', dialogContextRef.current);
        console.log('准备开始引导阶段，当前flowState:', flowStateRef.current);
        startGuide();
      }, 500);
      
    } catch (err) {
      setError('启动讨论时出错，请稍后重试');
      console.error('Start discussion error:', err);
    }
  };

  // 引导阶段
  const startGuide = async () => {
    console.log('开始引导阶段');
    console.log(`当前flowState:`, flowStateRef.current);
    
    // 防止重复请求 - 检查正在处理中的状态
    if (flowStateRef.current.isProcessing || stepInProgress[0]) {
      console.warn('已经有引导者请求在进行中，忽略重复请求');
      return;
    }
    
    // 增强对topic的验证
    if (!dialogContextRef.current || !dialogContextRef.current.user_q || dialogContextRef.current.user_q.trim() === '') {
      console.error('引导阶段：user_q为空，无法开始引导');
      console.log('当前dialogContextRef:', dialogContextRef.current);
      
      // 检查原始topic是否有值
      if (topic && topic.trim() !== '') {
        console.log('dialogContextRef.user_q为空，但topic有值，尝试恢复:', topic);
        // 尝试恢复user_q
        updateDialogContext({ user_q: topic });
        
        // 短暂延迟后重试
        setTimeout(() => {
          if (dialogContextRef.current.user_q && dialogContextRef.current.user_q.trim() !== '') {
            console.log('已成功恢复user_q，重新启动引导阶段');
            startGuide();
          } else {
            setError('讨论主题不能为空，请返回首页重新输入');
          }
        }, 100);
        return;
      }
      
      setError('讨论主题不能为空，请返回首页重新输入');
      return;
    }
    
    // 设置防重复标记
    setStepInProgress(prev => ({ ...prev, 0: true }));
    
    // 设置当前步骤
    updateFlowState({
      currentStep: 0,
      isProcessing: true
    });
    
    try {
      console.log('开始请求引导者API，当前topic:', dialogContextRef.current.user_q);
      setCurrentSpeaker('蓝鲸');
      currentResponseIdRef.current = '';
      setRequestStatus({
        speakerIndex: 0,
        isRetrying: false,
        canRetry: false
      });
      
      // 完整流式输出内容
      let fullStreamContent = '';
      
      // 使用ref中的user_q确保获取最新值
      const userQuery = dialogContextRef.current.user_q;
      
      cancelStreamRef.current = apiService.requestGuideStream(
        userQuery,
        (chunk, chunkId) => {
          currentResponseIdRef.current = chunkId;
          fullStreamContent += chunk; 
          addOrUpdateMessage('蓝鲸', fullStreamContent, 'guide', chunkId);
        },
        (fullText) => {
          console.log('引导者响应完成，准备进入讨论阶段');
          
          // 更新流程状态
          updateFlowState({
            currentStep: 0,
            isProcessing: false
          });
          
          // 添加角色到发言者列表中
          setSpokenRoles(prev => {
            const newRoles = new Set(prev);
            newRoles.add('蓝鲸');
            return newRoles;
          });
          
          setCurrentSpeaker(null);
          
          // 先直接更新本地变量，确保有值
          const updatedContext = { 
            ...dialogContextRef.current,  
            content_0: fullText 
          };
          
          // 直接设置dialogContext并使用回调确保更新完成
          updateDialogContext(updatedContext);
          console.log('已更新content_0到dialogContext和ref, 长度:', fullText.length);
          
          // 保存当前状态以确保连贯性
          const currentFlowState = { currentStep: 0, isProcessing: false };
          
          // 等待状态更新，然后再推进到下一阶段
          setTimeout(() => {
            console.log('延时后检查dialogContextRef:', dialogContextRef.current);
            console.log('延时后flowState应该是:', currentFlowState);
            
            if (dialogContextRef.current.content_0) {
              console.log('开始第一位讨论者发言，引导者内容长度:', dialogContextRef.current.content_0.length);
              // 重置第0步的防重复标记，然后启动第1步
              setStepInProgress(prev => ({ ...prev, 0: false }));
              
              // 强制再次设置流程状态，确保状态连贯
              updateFlowState(currentFlowState);
              
              // 短暂延迟以确保状态更新
              setTimeout(() => {
                console.log('准备启动第一位讨论者，确认flowState:', flowState);
                startDiscussant(1);
              }, 500);
            } else {
              console.error('引导者内容未能正确保存，无法继续');
              setError('对话上下文不完整，无法继续讨论');
              setStepInProgress(prev => ({ ...prev, 0: false }));
            }
          }, 1000); // 增加延迟以确保状态更新
        },
        (error) => {
          const canRetry = error.canRetry || false;
          console.error('引导者请求失败:', error);
          setError(`引导者发言时出错: ${error.message || '未知错误'}`);
          setCurrentSpeaker(null);
          setRequestStatus({
            speakerIndex: 0,
            isRetrying: false,
            canRetry
          });
          
          // 更新流程状态
          updateFlowState({
            currentStep: 0,
            isProcessing: false
          });
          
          // 重置防重复标记
          setStepInProgress(prev => ({ ...prev, 0: false }));
        }
      );
      
    } catch (err) {
      console.error('引导者请求出错:', err);
      setError('获取引导者回应时出错');
      setCurrentSpeaker(null);
      setRequestStatus({
        speakerIndex: 0,
        isRetrying: false,
        canRetry: true
      });
      
      // 更新流程状态
      updateFlowState({
        currentStep: 0,
        isProcessing: false
      });
      
      // 重置防重复标记
      setStepInProgress(prev => ({ ...prev, 0: false }));
    }
  };

  // 讨论者发言 - 整合了原speakerTurn函数的功能，但简化了流程控制
  const startDiscussant = async (index: number) => {
    console.log(`开始第${index}位讨论者(${speakerOrder[index] || '未知'})的发言`);
    console.log(`当前flowState:`, flowStateRef.current);
    
    // 防止重复请求
    if (flowStateRef.current.isProcessing || stepInProgress[index]) {
      console.warn(`已经有第${index}位讨论者请求在进行中，忽略重复请求`);
      return;
    }
    
    // 设置防重复标记
    setStepInProgress(prev => ({ ...prev, [index]: true }));
    
    // 修改跳跃检查逻辑 - 只检查极端情况跳跃
    if (index > 1 && flowStateRef.current.currentStep < 0) {
      console.error(`严重流程跳跃: 从${flowStateRef.current.currentStep}直接到${index}`);
      setError(`讨论流程异常: 尝试从步骤${flowStateRef.current.currentStep}跳到${index}`);
      setStepInProgress(prev => ({ ...prev, [index]: false }));
      return;
    }
    
    // 强制确保流程状态与当前讨论者匹配
    if (index > 1 && flowStateRef.current.currentStep !== index - 1) {
      console.log(`强制更新flowState从${flowStateRef.current.currentStep}到${index - 1}以确保连续性`);
      // 更新到前一个正确状态
      updateFlowState({
        currentStep: index - 1,
        isProcessing: false
      });
    }
    
    // 短暂延迟确保状态已更新
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 重新检查状态
    console.log(`准备开始讨论者${index}，当前flowState:`, flowStateRef.current);
    
    // 设置当前步骤
    updateFlowState({
      currentStep: index,
      isProcessing: true
    });
    
    try {
      // 使用AI_ROLES映射确保正确的角色名称
      const currentRole = AI_ROLES[index] || speakerOrder[index];
      console.log(`开始第${index}位讨论者(${currentRole})的请求`);
      
      setCurrentSpeaker(currentRole);
      currentResponseIdRef.current = '';
      setRequestStatus({
        speakerIndex: index,
        isRetrying: false,
        canRetry: false
      });
      
      // 完整流式输出内容
      let fullStreamContent = '';
      
      // 根据讨论者索引调用不同的API
      switch (index) {
        case 1: // 第一个讨论者
          if (!dialogContextRef.current.content_0 || dialogContextRef.current.content_0.trim() === '') {
            console.error('缺少引导者内容，无法请求第一位讨论者');
            console.log('dialogContextRef状态:', dialogContextRef.current);
            setError('对话上下文不完整，无法继续');
            setCurrentSpeaker(null);
            updateFlowState({ currentStep: index, isProcessing: false });
            setStepInProgress(prev => ({ ...prev, [index]: false }));
            return;
          }
          
          console.log('请求第一位讨论者时的引导者内容长度:', dialogContextRef.current.content_0.length);
          
          cancelStreamRef.current = apiService.requestDiscussant1Stream(
            {
              user_q: dialogContextRef.current.user_q,
              content_0: dialogContextRef.current.content_0
            },
            (chunk, chunkId) => {
              currentResponseIdRef.current = chunkId;
              fullStreamContent += chunk;
              addOrUpdateMessage(currentRole, fullStreamContent, 'opinion', chunkId);
            },
            (fullText) => {
              console.log('第一位讨论者响应完成，设置content_1');
              
              // 更新流程状态
              updateFlowState({
                currentStep: 1,
                isProcessing: false
              });
              
              setCurrentSpeaker(null);
              
              // 直接更新上下文并确保值存在
              const updatedContext = {
                ...dialogContextRef.current,
                content_1: fullText
              };
              
              updateDialogContext(updatedContext);
              console.log('第一位讨论者内容已保存到dialogContext，长度:', fullText.length);
              
              // 保存当前状态
              const currentFlowState = { currentStep: 1, isProcessing: false };
              
              // 等待状态更新，然后再推进到下一阶段
              setTimeout(() => {
                console.log('延时后检查dialogContextRef:', dialogContextRef.current);
                console.log('延时后flowState应该是:', currentFlowState);
                
                if (dialogContextRef.current.content_1) {
                  console.log('开始第二位讨论者发言，第一位内容长度:', dialogContextRef.current.content_1.length);
                  // 重置防重复标记，确保flowState正确后启动下一步
                  setStepInProgress(prev => ({ ...prev, [index]: false }));
                  
                  // 强制再次设置流程状态，确保状态连贯
                  updateFlowState(currentFlowState);
                  
                  // 短暂延迟以确保状态更新
                  setTimeout(() => {
                    console.log('准备启动第二位讨论者，确认flowState:', flowState);
                    startDiscussant(2);
                  }, 500);
                } else {
                  console.error('第一位讨论者内容未能正确保存，无法继续');
                  setError('对话上下文不完整，无法继续讨论');
                  setStepInProgress(prev => ({ ...prev, [index]: false }));
                }
              }, 1000); // 增加延迟以确保状态更新
            },
            (error) => {
              const canRetry = error.canRetry || false;
              setError(`${currentRole}发言时出错: ${error.message || '未知错误'}`);
              setCurrentSpeaker(null);
              setRequestStatus({
                speakerIndex: index,
                isRetrying: false,
                canRetry
              });
              
              // 更新流程状态
              updateFlowState({
                currentStep: 1,
                isProcessing: false
              });
              
              // 重置防重复标记
              setStepInProgress(prev => ({ ...prev, [index]: false }));
            }
          );
          break;
          
        case 2: // 第二个讨论者
          if (!dialogContextRef.current.content_0 || !dialogContextRef.current.content_1 || 
              dialogContextRef.current.content_0.trim() === '' || dialogContextRef.current.content_1.trim() === '') {
            console.error('缺少前置内容，无法请求第二位讨论者');
            console.log('dialogContextRef状态:', dialogContextRef.current);
            console.log('content_0存在:', !!dialogContextRef.current.content_0, '长度:', dialogContextRef.current.content_0?.length || 0);
            console.log('content_1存在:', !!dialogContextRef.current.content_1, '长度:', dialogContextRef.current.content_1?.length || 0);
            setError('对话上下文不完整，无法继续');
            setCurrentSpeaker(null);
            updateFlowState({ currentStep: index, isProcessing: false });
            setStepInProgress(prev => ({ ...prev, [index]: false }));
            return;
          }
          
          console.log('请求第二位讨论者，已有内容长度 - 引导者:', dialogContextRef.current.content_0.length, 
                      '第一位:', dialogContextRef.current.content_1.length);
          
          cancelStreamRef.current = apiService.requestDiscussant2Stream(
            {
              user_q: dialogContextRef.current.user_q,
              content_0: dialogContextRef.current.content_0,
              content_1: dialogContextRef.current.content_1
            },
            (chunk, chunkId) => {
              currentResponseIdRef.current = chunkId;
              fullStreamContent += chunk;
              addOrUpdateMessage(currentRole, fullStreamContent, 'opinion', chunkId);
            },
            (fullText) => {
              console.log('第二位讨论者响应完成，设置content_2');
              
              // 更新流程状态
              updateFlowState({
                currentStep: 2,
                isProcessing: false
              });
              
              setCurrentSpeaker(null);
              
              // 直接更新上下文并确保值存在
              const updatedContext = {
                ...dialogContextRef.current,
                content_2: fullText
              };
              
              updateDialogContext(updatedContext);
              console.log('第二位讨论者内容已保存到dialogContext，长度:', fullText.length);
              
              // 保存当前状态
              const currentFlowState = { currentStep: 2, isProcessing: false };
              
              // 等待状态更新，然后再推进到下一阶段
              setTimeout(() => {
                console.log('延时后检查dialogContextRef:', dialogContextRef.current);
                console.log('延时后flowState应该是:', currentFlowState);
                
                if (dialogContextRef.current.content_2) {
                  console.log('开始第三位讨论者发言，第二位内容长度:', dialogContextRef.current.content_2.length);
                  // 重置防重复标记，确保flowState正确后启动下一步
                  setStepInProgress(prev => ({ ...prev, [index]: false }));
                  
                  // 强制再次设置流程状态，确保状态连贯
                  updateFlowState(currentFlowState);
                  
                  // 短暂延迟以确保状态更新
                  setTimeout(() => {
                    console.log('准备启动第三位讨论者，确认flowState:', flowState);
                    startDiscussant(3);
                  }, 500);
                } else {
                  console.error('第二位讨论者内容未能正确保存，无法继续');
                  setError('对话上下文不完整，无法继续讨论');
                  setStepInProgress(prev => ({ ...prev, [index]: false }));
                }
              }, 1000); // 增加延迟以确保状态更新
            },
            (error) => {
              const canRetry = error.canRetry || false;
              setError(`${currentRole}发言时出错: ${error.message || '未知错误'}`);
              setCurrentSpeaker(null);
              setRequestStatus({
                speakerIndex: index,
                isRetrying: false,
                canRetry
              });
              
              // 更新流程状态
              updateFlowState({
                currentStep: 2,
                isProcessing: false
              });
              
              // 重置防重复标记
              setStepInProgress(prev => ({ ...prev, [index]: false }));
            }
          );
          break;
          
        case 3: // 第三个讨论者
          if (!dialogContextRef.current.content_0 || !dialogContextRef.current.content_1 || !dialogContextRef.current.content_2 ||
              dialogContextRef.current.content_0.trim() === '' || dialogContextRef.current.content_1.trim() === '' || 
              dialogContextRef.current.content_2.trim() === '') {
            console.error('缺少前置内容，无法请求第三位讨论者');
            console.log('dialogContextRef状态:', dialogContextRef.current);
            console.log('content_0存在:', !!dialogContextRef.current.content_0, '长度:', dialogContextRef.current.content_0?.length || 0);
            console.log('content_1存在:', !!dialogContextRef.current.content_1, '长度:', dialogContextRef.current.content_1?.length || 0);
            console.log('content_2存在:', !!dialogContextRef.current.content_2, '长度:', dialogContextRef.current.content_2?.length || 0);
            setError('对话上下文不完整，无法继续');
            setCurrentSpeaker(null);
            updateFlowState({ currentStep: index, isProcessing: false });
            setStepInProgress(prev => ({ ...prev, [index]: false }));
            return;
          }
          
          console.log('请求第三位讨论者，已有内容长度 - 引导者:', dialogContextRef.current.content_0.length, 
                      '第一位:', dialogContextRef.current.content_1.length, '第二位:', dialogContextRef.current.content_2.length);
          
          cancelStreamRef.current = apiService.requestDiscussant3Stream(
            {
              user_q: dialogContextRef.current.user_q,
              content_0: dialogContextRef.current.content_0,
              content_1: dialogContextRef.current.content_1,
              content_2: dialogContextRef.current.content_2
            },
            (chunk, chunkId) => {
              currentResponseIdRef.current = chunkId;
              fullStreamContent += chunk;
              addOrUpdateMessage(currentRole, fullStreamContent, 'opinion', chunkId);
            },
            (fullText) => {
              console.log('第三位讨论者响应完成，设置content_3');
              
              // 更新流程状态
              updateFlowState({
                currentStep: 3,
                isProcessing: false
              });
              
              setCurrentSpeaker(null);
              
              // 直接更新上下文并确保值存在
              const updatedContext = {
                ...dialogContextRef.current,
                content_3: fullText
              };
              
              updateDialogContext(updatedContext);
              console.log('第三位讨论者内容已保存到dialogContext，长度:', fullText.length);
              
              // 保存当前状态以确保连贯性
              const currentFlowState = { currentStep: 3, isProcessing: false };
              
              // 等待状态更新，然后再推进到下一阶段
              setTimeout(() => {
                console.log('延时后检查dialogContextRef:', dialogContextRef.current);
                console.log('延时后flowState应该是:', currentFlowState);
                
                if (dialogContextRef.current.content_3) {
                  console.log('开始总结阶段，第三位内容长度:', dialogContextRef.current.content_3.length);
                  // 重置防重复标记，确保flowState正确后启动总结阶段
                  setStepInProgress(prev => ({ ...prev, [index]: false }));
                  
                  // 强制再次设置流程状态，确保状态连贯
                  updateFlowState(currentFlowState);
                  
                  // 短暂延迟以确保状态更新
                  setTimeout(() => {
                    console.log('准备启动总结阶段，确认flowState:', flowState);
                    startSummary();
                  }, 500);
                } else {
                  console.error('第三位讨论者内容未能正确保存，无法继续');
                  setError('对话上下文不完整，无法继续讨论');
                  setStepInProgress(prev => ({ ...prev, [index]: false }));
                }
              }, 1000);
            },
            (error) => {
              const canRetry = error.canRetry || false;
              setError(`${currentRole}发言时出错: ${error.message || '未知错误'}`);
              setCurrentSpeaker(null);
              setRequestStatus({
                speakerIndex: index,
                isRetrying: false,
                canRetry
              });
              
              // 更新流程状态
              updateFlowState({
                currentStep: 3,
                isProcessing: false
              });
              
              // 重置防重复标记
              setStepInProgress(prev => ({ ...prev, [index]: false }));
            }
          );
          break;
      }
    } catch (err) {
      setError(`${speakerOrder[index]}发言时出错`);
      setCurrentSpeaker(null);
      setRequestStatus({
        speakerIndex: index,
        isRetrying: false,
        canRetry: true
      });
      
      // 更新流程状态
      updateFlowState({
        currentStep: index,
        isProcessing: false
      });
      
      // 重置防重复标记
      setStepInProgress(prev => ({ ...prev, [index]: false }));
    }
  };
  
  // 最后总结
  const startSummary = async () => {
    console.log('开始总结阶段');
    console.log(`当前flowState:`, flowStateRef.current);
    
    // 防止重复请求
    if (flowStateRef.current.isProcessing || stepInProgress[4]) {
      console.warn('已经有总结请求在进行中，忽略重复请求');
      return;
    }
    
    // 设置防重复标记
    setStepInProgress(prev => ({ ...prev, 4: true }));
    
    // 修改跳跃检查逻辑 - 只检查极端情况
    if (flowStateRef.current.currentStep < 0) {
      console.error(`严重流程跳跃: 从${flowStateRef.current.currentStep}直接到总结阶段`);
      setError(`讨论流程异常: 尝试从步骤${flowStateRef.current.currentStep}跳到总结阶段`);
      setStepInProgress(prev => ({ ...prev, 4: false }));
      return;
    }
    
    // 强制确保流程状态正确
    if (flowStateRef.current.currentStep !== 3) {
      console.log(`强制更新flowState从${flowStateRef.current.currentStep}到3以确保连续性`);
      updateFlowState({
        currentStep: 3, 
        isProcessing: false
      });
    }
    
    // 短暂延迟确保状态已更新
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 重新检查状态
    console.log(`准备开始总结阶段，当前flowState:`, flowStateRef.current);
    
    // 设置当前步骤
    updateFlowState({
      currentStep: 4,
      isProcessing: true
    });
    
    try {
      // 检查上下文是否完整
      const contextComplete = 
        !!dialogContextRef.current.user_q && 
        !!dialogContextRef.current.content_0 && 
        !!dialogContextRef.current.content_1 && 
        !!dialogContextRef.current.content_2 && 
        !!dialogContextRef.current.content_3 &&
        dialogContextRef.current.user_q.trim() !== '' &&
        dialogContextRef.current.content_0.trim() !== '' &&
        dialogContextRef.current.content_1.trim() !== '' &&
        dialogContextRef.current.content_2.trim() !== '' &&
        dialogContextRef.current.content_3.trim() !== '';
      
      if (!contextComplete) {
        const missingContent = [];
        if (!dialogContextRef.current.user_q || dialogContextRef.current.user_q.trim() === '') 
          missingContent.push('用户问题');
        if (!dialogContextRef.current.content_0 || dialogContextRef.current.content_0.trim() === '') 
          missingContent.push('引导者发言');
        if (!dialogContextRef.current.content_1 || dialogContextRef.current.content_1.trim() === '') 
          missingContent.push('第一位讨论者发言');
        if (!dialogContextRef.current.content_2 || dialogContextRef.current.content_2.trim() === '') 
          missingContent.push('第二位讨论者发言');
        if (!dialogContextRef.current.content_3 || dialogContextRef.current.content_3.trim() === '') 
          missingContent.push('第三位讨论者发言');
        
        console.log('内容检查状态:',
          '用户问题:', !!dialogContextRef.current.user_q, '长度:', dialogContextRef.current.user_q?.length || 0,
          '引导者:', !!dialogContextRef.current.content_0, '长度:', dialogContextRef.current.content_0?.length || 0,
          '第一位:', !!dialogContextRef.current.content_1, '长度:', dialogContextRef.current.content_1?.length || 0,
          '第二位:', !!dialogContextRef.current.content_2, '长度:', dialogContextRef.current.content_2?.length || 0,
          '第三位:', !!dialogContextRef.current.content_3, '长度:', dialogContextRef.current.content_3?.length || 0
        );
        
        console.log('dialogContextRef状态:', JSON.stringify(dialogContextRef.current, null, 2));
        
        const errorMsg = `无法生成总结：缺少${missingContent.join('、')}`;
        console.error(errorMsg);
        setError(errorMsg);
        setCurrentSpeaker(null);
        updateFlowState({ currentStep: 4, isProcessing: false });
        setStepInProgress(prev => ({ ...prev, 4: false }));
        return;
      }
      
      setCurrentSpeaker('蓝鲸');
      currentResponseIdRef.current = '';
      setRequestStatus({
        speakerIndex: 4,
        isRetrying: false,
        canRetry: false
      });
      
      // 完整流式输出内容
      let fullStreamContent = '';
      
      cancelStreamRef.current = apiService.requestSummaryStream(
        {
          user_q: dialogContextRef.current.user_q,
          content_0: (dialogContextRef.current.content_0 as string),
          content_1: (dialogContextRef.current.content_1 as string),
          content_2: (dialogContextRef.current.content_2 as string),
          content_3: (dialogContextRef.current.content_3 as string)
        },
        (chunk, chunkId) => {
          currentResponseIdRef.current = chunkId;
          fullStreamContent += chunk;
          addOrUpdateMessage('蓝鲸', fullStreamContent, 'summary', chunkId);
        },
        (fullText) => {
          console.log('总结生成完成');
          
          // 直接更新上下文并确保值存在
          const updatedContext = {
            ...dialogContextRef.current,
            content_4: fullText
          };
          
          updateDialogContext(updatedContext);
          console.log('总结内容已保存到dialogContext，长度:', fullText.length);
          
          setCurrentSpeaker(null);
          setIsComplete(true);
          
          // 更新流程状态为完成
          updateFlowState({
            currentStep: 5, // 5表示全部完成
            isProcessing: false
          });
          
          // 重置防重复标记
          setStepInProgress(prev => ({ ...prev, 4: false }));
        },
        (error) => {
          const canRetry = error.canRetry || false;
          console.error('总结请求失败:', error);
          setError(`获取总结时出错: ${error.message || '未知错误'}`);
          setCurrentSpeaker(null);
          setRequestStatus({
            speakerIndex: 4,
            isRetrying: false,
            canRetry
          });
          
          // 更新流程状态
          updateFlowState({
            currentStep: 4,
            isProcessing: false
          });
          
          // 重置防重复标记
          setStepInProgress(prev => ({ ...prev, 4: false }));
        }
      );
    } catch (err) {
      console.error('总结出错:', err);
      setError('获取总结时出错');
      setCurrentSpeaker(null);
      setRequestStatus({
        speakerIndex: 4,
        isRetrying: false,
        canRetry: true
      });
      
      // 更新流程状态
      updateFlowState({
        currentStep: 4,
        isProcessing: false
      });
      
      // 重置防重复标记
      setStepInProgress(prev => ({ ...prev, 4: false }));
    }
  };

  // 重新开始讨论
  const handleRestart = () => {
    console.log('用户手动重启讨论');
    
    // 取消当前的流式请求（如果有）
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    
    // 重置所有状态
    currentResponseIdRef.current = '';
    setCurrentSpeaker(null);
    setError(null);
    
    // 重置流程状态以确保从头开始
    updateFlowState({
      currentStep: -1,
      isProcessing: false
    });
    
    // 重置所有防重复标记
    setStepInProgress({
      0: false, 1: false, 2: false, 3: false, 4: false
    });
    
    // 重置对话上下文，但保留原始问题
    const userQ = dialogContextRef.current.user_q;
    updateDialogContext({ user_q: userQ });
    
    // 稍微延迟以确保状态已重置
    setTimeout(() => {
      startDiscussion();
    }, 500);
  };

  // 返回首页
  const handleBack = () => {
    console.log('返回首页');
    
    // 取消当前的流式请求（如果有）
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    
    navigate('/');
  };

  // 分享讨论
  const handleShare = () => {
    console.log('分享讨论');
    
    // 将对话上下文编码为 JSON 字符串并作为查询参数传递
    const dialogData = encodeURIComponent(JSON.stringify(dialogContextRef.current));
    navigate(`/share?topic=${encodeURIComponent(topic)}&id=${Date.now()}&data=${dialogData}`);
  };

  // 重试当前失败的请求
  const handleRetry = () => {
    if (!requestStatus.canRetry || requestStatus.isRetrying) return;
    
    console.log('重试当前失败的请求');
    
    // 取消当前的流式请求（如果有）
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    
    setRequestStatus(prev => ({ ...prev, isRetrying: true }));
    setError(null);
    
    if (requestStatus.speakerIndex === undefined) return;
    
    const speakerIndex = requestStatus.speakerIndex;
    
    // 根据speaker index决定重试哪个函数
    switch (speakerIndex) {
      case 0:
        setTimeout(() => startGuide(), 500);
        break;
      case 1:
      case 2:
      case 3:
        setTimeout(() => startDiscussant(speakerIndex), 500);
        break;
      case 4:
        setTimeout(() => startSummary(), 500);
        break;
      default:
        // 未知状态，重新开始讨论
        setTimeout(() => startDiscussion(), 500);
        break;
    }
  };

  // 计算每个阶段的状态
  const getStepStatus = (index: number) => {
    const isCurrentSpeaker = flowStateRef.current.currentStep === index;
    const isCompleted = index < flowStateRef.current.currentStep;
    
    // 检测错误状态
    const hasError = error !== null && requestStatus.speakerIndex === index;
    
    return {
      active: isCurrentSpeaker && !hasError && flowStateRef.current.isProcessing,
      completed: isCompleted && !hasError,
      error: hasError
    };
  };

  return (
    <DiscussionContainer>
      {contextHolder}
      <Header>
        <BackButton type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} />
        <StyledTitle level={4}>思考与表达</StyledTitle>
      </Header>
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: '1rem' }}>
            正在初始化讨论...
          </Paragraph>
        </div>
      ) : (
        <>
          <TopicCard>
            <Title level={4} style={{ color: '#f1f5f9', marginTop: 0 }}>当前议题</Title>
            <Paragraph style={{ color: '#e2e8f0', fontSize: '16px', marginBottom: 0 }}>
              {topic || <Spin size="small" style={{ marginRight: '8px' }} />}
            </Paragraph>
          </TopicCard>
          
          {/* 强化错误信息显示 */}
          {error && (
            <Alert
              message="处理过程中出现错误"
              description={
                <div>
                  <p>{error}</p>
                  {error.includes('返回首页') && (
                    <Button 
                      type="primary" 
                      size="small" 
                      onClick={handleBack}
                      style={{ marginTop: '8px' }}
                    >
                      返回首页
                    </Button>
                  )}
                </div>
              }
              type="error"
              showIcon
              action={
                requestStatus.canRetry && (
                  <Button size="small" danger onClick={handleRetry}>
                    重试
                  </Button>
                )
              }
              style={{ marginBottom: '1rem' }}
            />
          )}

          {/* 讨论进度展示 - 添加引用和粘性状态 */}
          <ProgressContainer isSticky={isProgressSticky}>
            <div ref={progressRef}>
              <DiscussionProgress isSticky={isProgressSticky}>
                {['引导', '讨论者1', '讨论者2', '讨论者3', '总结'].map((step, index) => {
                  const status = getStepStatus(index);
                  const isClickable = flowStateRef.current.currentStep >= index || status.completed;
                  return (
                    <ProgressStep 
                      key={index}
                      active={status.active}
                      completed={status.completed}
                      error={status.error}
                      clickable={isClickable}
                      onClick={() => isClickable && scrollToSection(index)}
                    >
                      {step}
                    </ProgressStep>
                  );
                })}
              </DiscussionProgress>
            </div>
          </ProgressContainer>
          
          <Divider style={{ borderColor: '#334155', opacity: 0.5 }} />
          
          <MessagesList>
            {messages.map((message, index) => {
              // 获取该消息的类型对应的索引
              let sectionIndex = -1;
              if (message.type === 'guide') sectionIndex = 0;
              else if (message.type === 'opinion') {
                if (message.role === '小元') sectionIndex = 1;
                else if (message.role === '暗面') sectionIndex = 2;
                else if (message.role === '包包') sectionIndex = 3;
              }
              else if (message.type === 'summary') sectionIndex = 4;
              
              return (
                <div 
                  key={message.id}
                  ref={el => {
                    // 为每类第一条消息设置引用
                    if (
                      (sectionIndex === 0 && messages.findIndex(m => m.type === 'guide') === index) ||
                      (sectionIndex === 1 && messages.findIndex(m => m.role === '小元') === index) ||
                      (sectionIndex === 2 && messages.findIndex(m => m.role === '暗面') === index) ||
                      (sectionIndex === 3 && messages.findIndex(m => m.role === '包包') === index) ||
                      (sectionIndex === 4 && messages.findIndex(m => m.type === 'summary') === index)
                    ) {
                      sectionRefs.current[sectionIndex] = el;
                    }
                    
                    // 最后一条消息的引用
                    if (index === messages.length - 1) {
                      lastMessageRef.current = el;
                    }
                  }}
                >
                  <AIMessage
                    role={message.role}
                    content={message.content}
                    type={message.type}
                  />
                </div>
              );
            })}
            
            {currentSpeaker && !currentResponseIdRef.current && (
              <div ref={lastMessageRef}>
                <AIMessage
                  role={currentSpeaker}
                  content=""
                  type={currentSpeaker === '蓝鲸' ? (messages.length === 0 ? 'guide' : 'summary') : 'opinion'}
                  isTyping
                />
              </div>
            )}
          </MessagesList>
          
          {isComplete && (
            <ActionButtons>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={handleRestart}
              >
                重新讨论
              </Button>
              <Button 
                icon={<ShareAltOutlined />}
                onClick={handleShare}
              >
                分享讨论
              </Button>
            </ActionButtons>
          )}
        </>
      )}
    </DiscussionContainer>
  );
};

export default Discussion; 