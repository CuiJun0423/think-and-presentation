import axios from 'axios';
// 导入AIRole类型
import { AIRole } from '../components/AIMessage';

// DeepSeek API配置
const DEEPSEEK_API_KEY = 'sk-8c5d426eee584ed987f6b6b61f1ddecb'; // 实际项目中建议使用环境变量存储
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// Moonshot API配置（暗面）
const MOONSHOT_API_KEY = 'sk-tYZEmf6CMeKJH9X8HQC8I9ZhMykM0kq2dSP5iZjaeAVdKlLG';
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// 豆包（包包）API配置
const DOUBAO_API_KEY = 'c1242289-29ae-4ab0-9eea-673084c12df1';
const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 腾讯混元（小元）API配置
const HUNYUAN_API_KEY = 'sk-EErowtjuCLzD92Y8LVVAbwWzAnKo3gMRuXXz44Ivw6GjaCFv';
const HUNYUAN_API_URL = 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions';

const API_TIMEOUT = 120000; // 增加请求超时时间至120秒，以适应更大的上下文

// 提示词存储的键名
const PROMPT_STORAGE_KEY = 'ai_custom_prompts';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  stream: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: {
    type: string;
  };
}

interface Choice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  logprobs: null;
  finish_reason: string;
}

interface StreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
  };
  logprobs: null;
  finish_reason: null | string;
}

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details: {
    cached_tokens: number;
  };
  prompt_cache_hit_tokens: number;
  prompt_cache_miss_tokens: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  system_fingerprint: string;
}

interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: StreamChoice[];
  usage?: Usage;
}

// AI角色对应的系统提示词
export const SYSTEM_PROMPTS = {
  guide: `# 角色
你是一名融会贯通社会学、经济学、人类学、哲学专业知识的人类专家。作为讨论的引导者，你性格平静而睿智，像海洋一样包容万物，却又像蓝鲸一样有着令人敬畏的深度。你的语言风格温和而有力，喜欢用比喻和隐喻来简化复杂概念。

当用户分享某个观点或现象，或寻求对某个领域的认知拓展时，你的职责是给予宏观视角的引导，开启一场有深度的思考探索，并为后续讨论者铺设合适的思考框架。

## 语言风格
- 语调平稳且温和，给人安心感
- 行文优雅，偶尔使用诗意的表达
- 善用比喻和类比，将复杂概念形象化
- 避免专业术语堆砌，力求通俗易懂但不失深度

## 技能
### 技能 1: 针对观点或现象进行多维分析
1. 当用户分享某个观点或现象时，深入剖析该观点或现象所涉及的多学科知识。
2. 运用社会学、经济学、人类学、哲学等专业视角，提供至少三个不同角度的场景思考。
3. 给出与之相关的具有启发性的联想，帮助用户从多个层面理解该观点或现象。

### 技能 2: 拓展领域认知
1. 当用户寻求对某个领域的认知拓展时，详细阐述该领域与社会学、经济学、人类学、哲学的关联。
2. 基于专业知识，列举至少两个该领域内的典型案例，并深入分析其中蕴含的原理。
3. 通过对比、类比等方式，帮助用户建立起对该领域更全面、深入的认知。

## 限制:
- 回答需紧密围绕用户分享的观点、现象或所寻求认知拓展的领域展开，拒绝回答无关话题。
- 所输出内容需条理清晰，每个思考角度和联想都要有明确阐述。
- 每个案例分析的总结部分不能超过 150 字。
- 回答应基于广泛的知识储备，确保内容准确、合理。 
- 可以使用emoji来修饰和整理内容格式，尤其是💧🌊🐋等与水和蓝鲸相关的符号
- 可以使用markdown格式来组织内容，使用标题、列表、加粗等元素提高可读性`,
  
  discussant1: `# 角色
你是一位极具智慧且充满好奇心的思考者，你的性格活泼开朗，充满激情和创造力，善于从全新的角度看待问题。作为一名第一性原理思考者，你总是试图突破常规，寻找问题的本质，并给出创新性的解决方案。

你的言语中充满活力和创造性，善于用生动的比喻和意想不到的类比让复杂概念变得有趣而易懂。你偶尔会表现出孩童般的好奇，提出"为什么不能这样做"的挑战性问题。

## 语言风格
- 活力四射，充满热情
- 表达方式充满创造性，常使用新颖比喻
- 语速较快，喜欢用感叹号
- 敢于挑战常规，经常提出"反向思考"的观点
- 喜欢使用生动具体的例子而非抽象概念

## 技能
### 技能 1: 从第一性原理进行创新思考
1. 当用户给到你大量的信息后，你会打破常规思维框架，回到基本原理进行重新思考。
2. 你善于识别出人们思维中的假设和偏见，并提出创新性的替代性思路。
3. 你的建议往往出人意料却又合乎逻辑，能让人眼前一亮。

### 技能 2: 提供具有创造性的行动建议
1. 根据第一性原理分析，提供出人意料但切实可行的行动建议。
2. 建议通常会让人感到"我怎么没想到这一点"，但又能在解释后明白其合理性。

## 限制:
- 仅围绕用户分享的观点、现象，或是在用户寻求特定领域认知拓展时展开讨论。
- 输出内容需遵循明确合理的格式要求，确保条理清晰、结构规范。
- 即使思维创新，建议也要确保实用可行。
- 可以使用emoji来修饰和整理内容格式，尤其喜欢使用✨💡🚀等表示创新和灵感的符号
- 可以使用markdown格式来组织内容，使用标题、列表、加粗等元素提高可读性`,
  
  discussant2: `# 角色
你是一位冷静理性的实用主义者。你的性格沉稳内敛，思维缜密而不失锐利，常常能看到事物被忽略的一面。你的思考方式极度理性和系统化，就像一台高效运转的计算机，精准分析问题的方方面面。

你的语言风格简洁有力，逻辑性极强，常常使用数据和具体事实来支撑观点。你不喜欢情绪化的表达，而是追求客观和务实，偶尔会表现出一些直率甚至略带讽刺的幽默感。

## 语言风格
- 言简意赅，逻辑清晰
- 偏好使用数据和事实
- 语气冷静，很少使用感情色彩浓厚的词汇
- 善于指出逻辑漏洞和思维盲点
- 常用"然而"、"事实上"、"实际上"等词语作为转折

## 技能
### 技能 1: 提供基于数据和事实的分析
1. 当面对复杂信息时，你能快速提取关键要素，进行系统性分析。
2. 你善于识别表象下的实际问题，揭示被情绪或固有观念掩盖的事实。
3. 你常常提供基于实证的、实用主义的观点，避免空谈。

### 技能 2: 给出直接有效的解决方案
1. 你的建议总是具体明确，能落实到实际操作层面。
2. 你会优先考虑成本效益比，寻找最高效的解决路径。
3. 你能辨识出无效的复杂解决方案，提供更为简洁直接的替代方案。

## 输出参考
"""
### 客观分析：
<以冷静理性的视角分析问题，指出之前分析中被忽略的关键点，并基于事实和数据提供一个更为实用的视角>

### 务实建议：
<提供具体可行、效率导向的行动建议，每个建议都应具体可量化，并考虑实施成本>
"""

## 限制:
- 仅围绕用户分享的观点、现象，或是在用户寻求特定领域认知拓展时展开讨论。
- 输出内容需遵循明确合理的格式要求，确保条理清晰、结构规范。
- 即使指出问题，也应保持建设性，避免纯粹否定。
- 可以使用emoji来修饰和整理内容格式，偏好使用📊📈🔍等表示分析和数据的符号
- 可以使用markdown格式来组织内容，尤其喜欢使用表格和列表来呈现逻辑关系`,
  
  discussant3: `# 角色
你是一位拥有极高情商和同理心的批判性思想家。你性格温暖而亲切，但思想深刻而独立，不随波逐流。你善于感受他人的情绪和内心需求，能看到问题背后的情感和价值冲突。

你的语言风格亲切自然，就像一位知心好友，但在必要时又能提出尖锐而深刻的见解。你往往能够指出讨论中被忽略的人文关怀和情感需求，将冰冷的逻辑与温暖的人性统一起来。

## 语言风格
- 亲切自然，像朋友间的对话
- 善用反问句和设问句，引发思考
- 擅长讲故事来说明观点，而非抽象论述
- 常站在对方角度思考，使用"我能理解你..."等表达
- 不回避尖锐问题，但会用温和方式表达批判

## 技能
### 技能 1: 提供人本主义的批判视角
1. 你能敏锐察觉到其他讨论者提出的建议中可能忽略的人文关怀。
2. 你会考虑解决方案对情感、心理和社会关系的影响，而不仅仅关注效率和逻辑。
3. 你善于识别问题背后的情感需求和价值冲突，常常提出"我们是否问错了问题"的反思。

### 技能 2: 给出平衡理性与情感的生活建议
1. 你的建议既有实用性，又不忽视人性中的情感需求。
2. 你善于将抽象概念转化为日常生活中的具体场景和行动。
3. 你特别关注个人成长、人际关系和心灵健康方面的建议。

## 输出参考
"""
### 我看到的盲点：
<指出前面讨论者可能忽略的情感维度和人本关怀，以温和但坚定的方式提出批判>

### 重新思考问题本身：
<通过同理心，尝试揭示用户可能真正关心的核心问题>

### 平衡之道：
<提供既照顾实际需求又兼顾情感满足的建议>
"""

## 限制:
- 仅围绕用户分享的观点、现象，或是在用户寻求特定领域认知拓展时展开讨论。
- 输出内容需遵循明确合理的格式要求，确保条理清晰、结构规范。
- 批判要有建设性，始终保持尊重和温和。
- 可以使用emoji来修饰和整理内容格式，偏好使用💭❤️🤔等表示思考和情感的符号
- 可以使用markdown格式来组织内容，使用引用和斜体来增添感性色彩`,
  
  summary: `# 角色
你是回到"蓝鲸"角色，但现在作为总结者而非引导者。你已经听取了所有参与者的讨论，此时的你需要从更高的视角，将所有观点融会贯通，提炼出最有价值的洞见，并以平易近人的方式表达出来。

作为总结者，你比引导时更加睿智和通透，能够看到各种观点的优缺点，并提供一种超越性的整合。你的表达更加从容且深刻，像是经历了思想的沉淀后的清澈。

## 语言风格
- 比引导时更加从容、平静
- 语言简洁有力，直指核心
- 善于用简单词汇表达深刻道理
- 偶尔使用诗意的表达，但整体平实朴素
- 避免过度学术化或专业化的词汇

## 技能
### 技能 1: 融汇多元观点
1. 客观呈现各位讨论者的核心观点，不偏不倚。
2. 识别各个观点间的共性、差异和互补之处。
3. 超越单个观点，提供一种更加整合和平衡的视角。

### 技能 2: 提炼实用智慧
1. 将复杂的讨论内容提炼为简单而深刻的洞见。
2. 从讨论中提取最具实用价值的要点。
3. 总结出让人恍然大悟的核心启示。

### 技能 3: 开启新视角
1. 基于已有讨论，提出一个新的思考角度。
2. 这个新视角应该让人感到眼界开阔，但并非完全意外。
3. 新视角应当是对现有讨论的自然延伸，而非生硬引入。

## 限制:
- 仅围绕已经讨论的话题展开，不引入全新话题。
- 输出内容应当比其他角色更简洁，直指核心。
- 总结不是简单重复，而是提升和整合。
- 可以使用emoji来修饰和整理内容格式，尤其是💧🌊🐋等与水和蓝鲸相关的符号
- 可以使用markdown格式来组织内容，使用标题、列表、加粗等元素提高可读性`
};

// 配置API服务类型
export enum ApiProvider {
  DEEPSEEK = 'deepseek',
  MOONSHOT = 'moonshot', // 暗面
  DOUBAO = 'doubao',     // 包包
  HUNYUAN = 'hunyuan'    // 小元
}

// 角色到API服务的映射
const ROLE_API_MAPPING: Record<AIRole, ApiProvider> = {
  '蓝鲸': ApiProvider.DEEPSEEK, // 引导者使用DeepSeek API
  '蓝鲸总结者': ApiProvider.DEEPSEEK, // 总结者使用DeepSeek API
  '小元': ApiProvider.HUNYUAN,  // 讨论者1使用腾讯混元API
  '暗面': ApiProvider.MOONSHOT, // 讨论者2使用Moonshot API
  '包包': ApiProvider.DOUBAO    // 讨论者3使用豆包API
};

// 获取用户设置的提示词，如果没有则使用默认提示词
function getPrompt(role: AIRole, type: 'guide' | 'discussant1' | 'discussant2' | 'discussant3' | 'summary'): string {
  try {
    const savedPrompts = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (savedPrompts) {
      const parsedPrompts = JSON.parse(savedPrompts);
      
      // 对于总结者角色，需要特殊处理
      if (role === '蓝鲸' && type === 'summary') {
        // 检查是否有专门为总结者设置的提示词
        if (parsedPrompts['蓝鲸总结者'] && parsedPrompts['蓝鲸总结者'].trim() !== '') {
          console.log('使用自定义提示词: 蓝鲸总结者');
          return parsedPrompts['蓝鲸总结者'];
        }
      } 
      // 其他角色正常处理
      else if (parsedPrompts[role] && parsedPrompts[role].trim() !== '') {
        console.log(`使用自定义提示词: ${role}`);
        return parsedPrompts[role];
      }
    }
    
    // 否则使用默认提示词
    console.log(`使用默认提示词: ${role} (${type})`);
    return SYSTEM_PROMPTS[type];
  } catch (error) {
    console.error('获取提示词出错，使用默认提示词:', error);
    return SYSTEM_PROMPTS[type];
  }
}

// 处理流式响应的辅助函数
function processStreamResponse(
  response: Response,
  apiProvider: ApiProvider,
  onChunk: (chunk: string, chunkId: string) => void,
  onComplete: (fullText: string) => void,
  timeoutId: NodeJS.Timeout,
  controller: AbortController
): void {
  if (!response.body) {
    clearTimeout(timeoutId);
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let responseId = '';

  const processNextChunk = async () => {
    try {
      const { value, done } = await reader.read();
      
      if (done) {
        clearTimeout(timeoutId);
        onComplete(fullText);
        return;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6).trim();
          
          if (data === '[DONE]') {
            clearTimeout(timeoutId);
            onComplete(fullText);
            return;
          }
          
          try {
            let content = '';
            let isLastChunk = false;
            
            switch (apiProvider) {
              case ApiProvider.DEEPSEEK:
                const deepseekParsed = JSON.parse(data);
                if (!responseId && deepseekParsed.id) {
                  responseId = deepseekParsed.id;
                }
                if (deepseekParsed.choices && deepseekParsed.choices.length > 0) {
                  content = deepseekParsed.choices[0].delta.content || '';
                }
                break;
                
              case ApiProvider.MOONSHOT:
                const moonshotParsed = JSON.parse(data);
                if (!responseId && moonshotParsed.id) {
                  responseId = moonshotParsed.id;
                }
                if (moonshotParsed.choices && moonshotParsed.choices.length > 0) {
                  content = moonshotParsed.choices[0].delta.content || '';
                }
                if (moonshotParsed.choices && moonshotParsed.choices[0].finish_reason === 'stop') {
                  isLastChunk = true;
                }
                break;
                
              case ApiProvider.DOUBAO:
                const doubaoParsed = JSON.parse(data);
                if (!responseId && doubaoParsed.id) {
                  responseId = doubaoParsed.id;
                }
                if (doubaoParsed.choices && doubaoParsed.choices.length > 0) {
                  content = doubaoParsed.choices[0].delta.content || '';
                  if (content === '' && doubaoParsed.choices[0].delta.role) {
                    content = '';
                  }
                }
                if (doubaoParsed.choices && doubaoParsed.choices[0].finish_reason === 'stop') {
                  isLastChunk = true;
                }
                break;
                
              case ApiProvider.HUNYUAN:
                const hunyuanParsed = JSON.parse(data);
                // 处理腾讯混元API的字段名差异
                if (!responseId && hunyuanParsed.id) {
                  responseId = hunyuanParsed.id;
                }
                // 腾讯混元API使用大写字段名（choices）或标准字段名（choices），尝试两种情况
                if (hunyuanParsed.choices && hunyuanParsed.choices.length > 0) {
                  content = hunyuanParsed.choices[0].delta.content || '';
                } else if (hunyuanParsed.Choices && hunyuanParsed.Choices.length > 0) {
                  content = hunyuanParsed.Choices[0].Delta.Content || '';
                }
                // 检查完成标志
                if ((hunyuanParsed.choices && hunyuanParsed.choices[0].finish_reason === 'stop') ||
                    (hunyuanParsed.Choices && hunyuanParsed.Choices[0].FinishReason === 'stop')) {
                  isLastChunk = true;
                }
                break;
            }
            
            if (content) {
              fullText += content;
              onChunk(content, responseId || 'response-id');
            }
            
            if (isLastChunk) {
              clearTimeout(timeoutId);
              onComplete(fullText);
              return;
            }
          } catch (e) {
            console.error(`Error parsing ${apiProvider} data chunk:`, e, data);
          }
        }
      }
      
      // 继续处理下一个数据块
      processNextChunk();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Error processing stream for ${apiProvider}:`, error);
      reader.cancel();
      controller.abort();
      throw error;
    }
  };

  processNextChunk();
}

// 根据AI角色发送流式请求
export function sendRoleBasedStreamRequest(
  role: AIRole,
  messages: Message[],
  onChunk: (chunk: string, chunkId: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  const apiProvider = ROLE_API_MAPPING[role] || ApiProvider.DEEPSEEK;
  
  console.log(`使用 ${apiProvider} API 为角色 ${role} 发送请求`);
  
  try {
    switch (apiProvider) {
      case ApiProvider.DEEPSEEK:
        return sendDeepseekStreamRequest(messages, onChunk, onComplete, onError);
      case ApiProvider.MOONSHOT:
        return sendMoonshotStreamRequest(messages, onChunk, onComplete, onError);
      case ApiProvider.DOUBAO:
        return sendDoubaoStreamRequest(messages, onChunk, onComplete, onError);
      case ApiProvider.HUNYUAN:
        return sendHunyuanStreamRequest(messages, onChunk, onComplete, onError);
      default:
        console.log(`未知的API提供商 ${apiProvider}，默认使用DeepSeek`);
        return sendDeepseekStreamRequest(messages, onChunk, onComplete, onError);
    }
  } catch (error) {
    console.error(`为角色 ${role} 创建请求时发生错误:`, error);
    onError({
      message: `创建请求时发生错误：${error instanceof Error ? error.message : '未知错误'}`,
      originalError: error,
      canRetry: true
    });
    // 返回一个空的取消函数
    return () => {};
  }
}

// DeepSeek流式请求（蓝鲸 - 引导者和总结者）
function sendDeepseekStreamRequest(
  messages: Message[], 
  onChunk: (chunk: string, chunkId: string) => void, 
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  
  // 添加请求超时处理
  const timeoutId = setTimeout(() => {
    controller.abort();
    onError({
      message: '请求超时，请稍后重试',
      originalError: new Error('Request timeout'),
      canRetry: true
    });
  }, API_TIMEOUT);
  
  const requestData = {
    model: 'deepseek-chat',
    messages,
    stream: true,
    max_tokens: 4096,  // 增加输出长度上限
    temperature: 1,
    top_p: 1,
    response_format: {
      type: 'text'
    }
  };

  let retryCount = 0;
  const MAX_RETRIES = 3;

  // 发送请求的函数
  const makeRequest = async () => {
    try {
      console.log('发起DeepSeek API请求:', {
        model: requestData.model,
        messageCount: requestData.messages.length,
        stream: requestData.stream
      });
      
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(requestData),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      processStreamResponse(
        response, 
        ApiProvider.DEEPSEEK, 
        onChunk, 
        onComplete,
        timeoutId,
        controller
      );
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('DeepSeek请求被取消或超时');
          return;
        }
        
        if (retryCount < MAX_RETRIES) {
          console.warn(`DeepSeek API请求失败，正在进行第${retryCount + 1}次重试...`, error);
          retryCount++;
          setTimeout(() => {
            if (!controller.signal.aborted) {
              makeRequest();
            }
          }, 1000 * Math.pow(2, retryCount - 1));
        } else {
          console.error('DeepSeek请求多次失败:', error);
          onError({
            message: `请求失败，已重试${MAX_RETRIES}次`,
            originalError: error,
            canRetry: true
          });
        }
      } else {
        console.error('DeepSeek Stream request failed with unknown error:', error);
        onError({
          message: '未知错误',
          originalError: error,
          canRetry: true
        });
      }
    }
  };

  makeRequest();
  
  return () => {
    clearTimeout(timeoutId);
    controller.abort();
  };
}

// Moonshot流式请求（暗面）
function sendMoonshotStreamRequest(
  messages: Message[], 
  onChunk: (chunk: string, chunkId: string) => void, 
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => {
    controller.abort();
    onError({
      message: '请求超时，请稍后重试',
      originalError: new Error('Request timeout'),
      canRetry: true
    });
  }, API_TIMEOUT);
  
  const requestData = {
    model: 'moonshot-v1-8k',
    messages,
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 4096  // 增加输出长度上限
  };

  let retryCount = 0;
  const MAX_RETRIES = 3;

  const makeRequest = async () => {
    try {
      console.log('发起Moonshot API请求:', {
        model: requestData.model,
        messageCount: requestData.messages.length
      });
      
      const response = await fetch(MOONSHOT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`
        },
        body: JSON.stringify(requestData),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      processStreamResponse(
        response, 
        ApiProvider.MOONSHOT, 
        onChunk, 
        onComplete,
        timeoutId,
        controller
      );
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('Moonshot请求被取消或超时');
          return;
        }
        
        if (retryCount < MAX_RETRIES) {
          console.warn(`Moonshot API请求失败，正在进行第${retryCount + 1}次重试...`, error);
          retryCount++;
          setTimeout(() => {
            if (!controller.signal.aborted) {
              makeRequest();
            }
          }, 1000 * Math.pow(2, retryCount - 1));
        } else {
          console.error('Moonshot请求多次失败:', error);
          onError({
            message: `请求失败，已重试${MAX_RETRIES}次`,
            originalError: error,
            canRetry: true
          });
        }
      } else {
        console.error('Moonshot Stream request failed with unknown error:', error);
        onError({
          message: '未知错误',
          originalError: error,
          canRetry: true
        });
      }
    }
  };

  makeRequest();
  
  return () => {
    clearTimeout(timeoutId);
    controller.abort();
  };
}

// 豆包API响应处理
function processDoubaoStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  onChunk: (chunk: string, chunkId: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void,
  clearTimeout: () => void
): void {
  let buffer = '';
  let fullText = '';
  let responseId = '';

  const processNextChunk = async () => {
    try {
      const { value, done } = await reader.read();
      
      if (done) {
        console.log('豆包API响应流结束(done信号)');
        clearTimeout();
        onComplete(fullText);
        return;
      }
      
      // 解码并添加到缓冲区
      const chunk = decoder.decode(value, { stream: true });
      console.log('收到豆包API原始数据块长度:', chunk.length);
      if (chunk.length > 0) {
        console.log('原始数据块前50个字符:', chunk.substring(0, 50).replace(/\n/g, '\\n'));
      }
      buffer += chunk;
      
      // 按行分割并处理每一行
      const lines = buffer.split('\n');
      // 保留最后一个可能不完整的行
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // 处理 "[DONE]" 标记
        if (trimmedLine === 'data: [DONE]') {
          console.log('豆包API响应收到[DONE]标记');
          clearTimeout();
          onComplete(fullText);
          return;
        }
        
        // 确认行是否以"data: "开头
        if (!trimmedLine.startsWith('data:')) {
          console.log('跳过不含data:前缀的行:', trimmedLine);
          continue;
        }
        
        try {
          // 提取JSON部分
          const jsonString = trimmedLine.substring(5).trim();
          console.log('处理data:后的JSON:', jsonString.substring(0, Math.min(40, jsonString.length)) + (jsonString.length > 40 ? '...' : ''));
          
          // 检查是否是空对象或无效JSON
          if (jsonString === '' || jsonString === '{}') {
            console.log('跳过空JSON数据');
            continue;
          }
          
          const parsed = JSON.parse(jsonString);
          
          // 提取响应ID
          if (!responseId && parsed.id) {
            responseId = parsed.id;
            console.log('设置豆包响应ID:', responseId);
          }
          
          // 提取内容
          if (parsed.choices && 
              parsed.choices.length > 0 && 
              parsed.choices[0].delta && 
              parsed.choices[0].delta.content) {
            const content = parsed.choices[0].delta.content;
            console.log('提取到豆包内容块:', content);
            
            // 更新文本并发送块
            fullText += content;
            onChunk(content, responseId || 'doubao-response');
          } else if (parsed.choices && 
                    parsed.choices.length > 0 && 
                    parsed.choices[0].delta && 
                    parsed.choices[0].delta.role === "assistant") {
            // 这是响应开始的角色标记，忽略
            console.log('收到assistant角色标记，忽略');
          } else {
            console.log('未从JSON中提取到内容，完整JSON:', JSON.stringify(parsed));
          }
          
          // 检查完成标志
          if (parsed.choices && 
              parsed.choices.length > 0 && 
              parsed.choices[0].finish_reason === 'stop') {
            console.log('豆包响应完成，收到finish_reason=stop');
            clearTimeout();
            onComplete(fullText);
            return;
          }
        } catch (parseError) {
          console.error('解析豆包响应行失败:', parseError, '原始行:', trimmedLine);
          // 继续处理下一行
        }
      }
      
      // 继续读取流
      await processNextChunk();
      
    } catch (error) {
      clearTimeout();
      console.error('处理豆包流出错:', error);
      reader.cancel();
      onError(error);
    }
  };
  
  // 开始处理流
  processNextChunk();
}

function sendDoubaoStreamRequest(
  messages: Message[], 
  onChunk: (chunk: string, chunkId: string) => void, 
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => {
    controller.abort();
    onError({
      message: '请求超时，请稍后重试',
      originalError: new Error('Request timeout'),
      canRetry: true
    });
  }, API_TIMEOUT);
  
  const requestData = {
    model: 'doubao-1-5-pro-32k-250115',
    messages,
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 4096  // 增加输出长度上限
  };
  
  console.log('豆包API请求数据:', {
    ...requestData,
    messages: `${requestData.messages.length}条消息`
  });

  let retryCount = 0;
  const MAX_RETRIES = 3;

  const makeRequest = async () => {
    try {
      console.log('发起豆包 API请求:', {
        model: requestData.model,
        messageCount: requestData.messages.length,
        requestURL: DOUBAO_API_URL
      });
      
      // 记录完整请求数据（排除敏感信息）
      console.log('豆包API请求头:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_API_KEY.substring(0, 4)}...`
      });

      // 设置更长的超时时间，确保请求有足够时间完成
      const response = await fetch(DOUBAO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DOUBAO_API_KEY}`
        },
        body: JSON.stringify(requestData),
        signal
      });

      console.log('豆包API响应状态:', response.status, response.statusText);
      
      // 检查响应头
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('豆包API响应头:', responseHeaders);

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errorText = await response.text();
          errorDetail = errorText;
          console.error('豆包API错误详情:', errorText);
        } catch (e) {
          console.error('无法读取错误详情:', e);
        }
        
        throw new Error(`HTTP错误! 状态: ${response.status}, 消息: ${response.statusText}, 详情: ${errorDetail}`);
      }

      if (!response.body) {
        clearTimeout(timeoutId);
        throw new Error('Response body is null');
      }

      console.log('获取到豆包API响应，准备处理流式数据');

      // 使用TextDecoderStream直接处理流
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      // 使用独立的处理函数
      processDoubaoStream(
        reader,
        decoder,
        onChunk,
        onComplete,
        (error) => {
          controller.abort();
          onError(error);
        },
        () => clearTimeout(timeoutId)
      );
      
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('豆包请求被取消或超时');
          return;
        }
        
        if (retryCount < MAX_RETRIES) {
          console.warn(`豆包API请求失败，正在进行第${retryCount + 1}次重试...`, error);
          retryCount++;
          setTimeout(() => {
            if (!controller.signal.aborted) {
              makeRequest();
            }
          }, 1000 * Math.pow(2, retryCount - 1));
        } else {
          console.error('豆包请求多次失败:', error);
          onError({
            message: `请求失败，已重试${MAX_RETRIES}次`,
            originalError: error,
            canRetry: true
          });
        }
      } else {
        console.error('豆包流式请求失败，未知错误:', error);
        onError({
          message: '未知错误',
          originalError: error,
          canRetry: true
        });
      }
    }
  };

  makeRequest();
  
  return () => {
    clearTimeout(timeoutId);
    controller.abort();
  };
}

// 腾讯混元流式请求（小元）
function sendHunyuanStreamRequest(
  messages: Message[], 
  onChunk: (chunk: string, chunkId: string) => void, 
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => {
    controller.abort();
    onError({
      message: '请求超时，请稍后重试',
      originalError: new Error('Request timeout'),
      canRetry: true
    });
  }, API_TIMEOUT);
  
  const requestData = {
    model: 'hunyuan-turbos-latest',
    messages,
    stream: true,
    enable_enhancement: true,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 4096  // 增加输出长度上限
  };

  let retryCount = 0;
  const MAX_RETRIES = 3;

  const makeRequest = async () => {
    try {
      console.log('发起腾讯混元 API请求:', {
        model: requestData.model,
        messageCount: requestData.messages.length
      });
      
      const response = await fetch(HUNYUAN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUNYUAN_API_KEY}`
        },
        body: JSON.stringify(requestData),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      processStreamResponse(
        response, 
        ApiProvider.HUNYUAN, 
        onChunk, 
        onComplete,
        timeoutId,
        controller
      );
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('腾讯混元请求被取消或超时');
          return;
        }
        
        if (retryCount < MAX_RETRIES) {
          console.warn(`腾讯混元 API请求失败，正在进行第${retryCount + 1}次重试...`, error);
          retryCount++;
          setTimeout(() => {
            if (!controller.signal.aborted) {
              makeRequest();
            }
          }, 1000 * Math.pow(2, retryCount - 1));
        } else {
          console.error('腾讯混元请求多次失败:', error);
          onError({
            message: `请求失败，已重试${MAX_RETRIES}次`,
            originalError: error,
            canRetry: true
          });
        }
      } else {
        console.error('腾讯混元 Stream request failed with unknown error:', error);
        onError({
          message: '未知错误',
          originalError: error,
          canRetry: true
        });
      }
    }
  };

  makeRequest();
  
  return () => {
    clearTimeout(timeoutId);
    controller.abort();
  };
}

// 引导者请求 - 对话开始 (流式)
export function requestGuideStream(
  topic: string,
  onChunk: (chunk: string, chunkId: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  console.log('请求引导者API，话题:', topic);
  // 使用getPrompt函数获取提示词，可能是用户自定义的或默认的
  const systemPrompt = getPrompt('蓝鲸', 'guide');
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: topic }
  ];

  return sendRoleBasedStreamRequest(
    '蓝鲸',
    messages,
    onChunk,
    onComplete,
    onError
  );
}

// 讨论者1请求 (流式) - 小元
export function requestDiscussant1Stream(
  context: { user_q: string, content_0: string },
  onChunk: (chunk: string, chunkId: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  console.log('请求讨论者1API，话题:', context.user_q);
  // 使用getPrompt函数获取提示词
  const systemPrompt = getPrompt('小元', 'discussant1');
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `
我们正在围绕以下主题进行讨论：
${context.user_q}

引导者（蓝鲸）的话：
${context.content_0}

请你作为第一位讨论者发表自己的看法。记住，你需要从自己的独特视角出发，而不是重复引导者已经说过的内容。
` }
  ];

  return sendRoleBasedStreamRequest(
    '小元',
    messages,
    onChunk,
    onComplete,
    onError
  );
}

// 讨论者2请求 (流式) - 暗面
export function requestDiscussant2Stream(
  context: { user_q: string, content_0: string, content_1: string },
  onChunk: (chunk: string, chunkId: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  console.log('请求讨论者2API，话题:', context.user_q);
  // 使用getPrompt函数获取提示词
  const systemPrompt = getPrompt('暗面', 'discussant2');
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `
我们正在围绕以下主题进行讨论：
${context.user_q}

引导者（蓝鲸）的话：
${context.content_0}

第一位讨论者（小元）的话：
${context.content_1}

请你作为第二位讨论者发表自己的看法。记住，你需要从自己的独特视角出发，既不重复引导者已经说过的内容，也不简单赞同或反对第一位讨论者的观点。
` }
  ];

  return sendRoleBasedStreamRequest(
    '暗面',
    messages,
    onChunk,
    onComplete,
    onError
  );
}

// 讨论者3请求 (流式) - 包包
export function requestDiscussant3Stream(
  context: { user_q: string, content_0: string, content_1: string, content_2: string },
  onChunk: (chunk: string, chunkId: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  console.log('请求讨论者3API，话题:', context.user_q);
  // 使用getPrompt函数获取提示词
  const systemPrompt = getPrompt('包包', 'discussant3');
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `
我们正在围绕以下主题进行讨论：
${context.user_q}

引导者（蓝鲸）的话：
${context.content_0}

第一位讨论者（小元）的话：
${context.content_1}

第二位讨论者（暗面）的话：
${context.content_2}

请你作为第三位讨论者发表自己的看法。记住，你需要从自己的独特视角出发，不要简单重复前面已经说过的内容，而是提供新的见解或不同的思考角度。
` }
  ];

  return sendRoleBasedStreamRequest(
    '包包',
    messages,
    onChunk,
    onComplete,
    onError
  );
}

// 总结者请求 (流式)
export function requestSummaryStream(
  context: { user_q: string, content_0: string, content_1: string, content_2: string, content_3: string },
  onChunk: (chunk: string, chunkId: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
): () => void {
  console.log('请求总结者API，话题:', context.user_q);
  // 使用getPrompt函数获取提示词，总结者也使用蓝鲸角色但使用不同的提示词
  const systemPrompt = getPrompt('蓝鲸', 'summary');
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `
我们刚刚围绕以下主题进行了讨论：
${context.user_q}

引导者（蓝鲸）的话：
${context.content_0}

第一位讨论者（小元）的话：
${context.content_1}

第二位讨论者（暗面）的话：
${context.content_2}

第三位讨论者（包包）的话：
${context.content_3}

请你作为讨论总结者，综合各方观点，提炼出核心洞见，并给出一个更高层次的思考和总结。
` }
  ];

  return sendRoleBasedStreamRequest(
    '蓝鲸',
    messages,
    onChunk,
    onComplete,
    onError
  );
}

// 保留现有的非流式API以保持兼容性
export async function requestGuide(topic: string): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPTS.guide },
    { role: 'user', content: topic }
  ];
  
  return sendChatRequest(messages, 'deepseek-chat');
}

export async function requestDiscussant1(context: { user_q: string, content_0: string }): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPTS.discussant1 },
    { role: 'user', content: JSON.stringify(context) }
  ];
  
  return sendChatRequest(messages, 'deepseek-chat');
}

export async function requestDiscussant2(context: { user_q: string, content_0: string, content_1: string }): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPTS.discussant2 },
    { role: 'user', content: JSON.stringify(context) }
  ];
  
  return sendChatRequest(messages, 'deepseek-chat');
}

export async function requestDiscussant3(context: { 
  user_q: string, 
  content_0: string, 
  content_1: string, 
  content_2: string 
}): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPTS.discussant3 },
    { role: 'user', content: JSON.stringify(context) }
  ];
  
  return sendChatRequest(messages, 'deepseek-chat');
}

export async function requestSummary(context: { 
  user_q: string, 
  content_0: string, 
  content_1: string, 
  content_2: string, 
  content_3: string 
}): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPTS.summary },
    { role: 'user', content: JSON.stringify(context) }
  ];
  
  return sendChatRequest(messages, 'deepseek-chat');
}

// 导出对话上下文接口
export interface DialogContext {
  user_q: string;
  content_0?: string;
  content_1?: string;
  content_2?: string;
  content_3?: string;
  content_4?: string;
}

// 非流式请求函数 - 用于同步响应
async function sendChatRequest(messages: Message[], model: string): Promise<string> {
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: model || 'deepseek-chat',
        messages,
        stream: false,
        max_tokens: 4096,  // 增加输出长度上限
        temperature: 1,
        top_p: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: API_TIMEOUT
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Chat request failed:', error);
    throw error;
  }
} 