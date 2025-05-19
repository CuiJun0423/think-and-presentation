import React, { useState } from 'react';
import { Typography, Input, Button, Card, Space, Divider, Select } from 'antd';
import styled from 'styled-components';
import { SendOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const StyledCard = styled(Card)`
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  background-color: #1e293b;
`;

const PreviewContainer = styled.div`
  background-color: rgba(30, 41, 59, 0.7);
  border-left: 3px solid #3b82f6;
  border-radius: 0 8px 8px 0;
  padding: 16px;
  margin-top: 1rem;
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

// 预设的markdown示例
const MARKDOWN_EXAMPLES = {
  basic: `# Markdown基础示例

## 标题和段落

这是一个**粗体文本**和*斜体文本*的示例。
你也可以使用~~删除线~~。

## 列表

### 无序列表
- 项目一
- 项目二
  - 子项目A
  - 子项目B

### 有序列表
1. 第一步
2. 第二步
3. 第三步

## 引用和代码

> 这是一段引用文本
> 可以跨多行

\`\`\`javascript
// 这是代码块
function sayHello() {
  console.log("Hello, Markdown!");
}
\`\`\`

行内代码: \`const x = 10;\`

## 链接和图片

[链接文本](https://example.com)

![图片描述](https://via.placeholder.com/150)

## 表格

| 名称 | 类型 | 描述 |
|------|------|------|
| id   | number | 用户ID |
| name | string | 用户名称 |
| age  | number | 用户年龄 |`,

  rich: `# 🌟 AI讨论与思考

## 🧠 关于现代社会的思考

在现代社会中，我们面临着诸多挑战和机遇。下面是一些核心观点:

### 信息过载
现代人每天接收的信息是18世纪一个人一生信息量的**5倍**。这导致我们常常感到:

- 注意力分散
- 决策疲劳
- 焦虑增加

> "我们被太多信息淹没，却渴望知识" — T.S. Eliot

### 社会连接的悖论

虽然社交媒体让我们与世界相连，但研究表明:

| 连接类型 | 心理影响 |
|----------|----------|
| 面对面交流 | 降低抑郁风险55% |
| 社交媒体交流 | 降低抑郁风险仅7% |

## 🌈 解决方案

我相信解决方案在于:

1. 培养深度思考习惯
2. 建立真实社会连接
3. 实践有意识的技术使用

\`\`\`python
# 简单算法思考
def find_balance(technology, human_needs):
    if technology.serves(human_needs):
        return "和谐生活"
    else:
        return "重新评估"
\`\`\`

## 💡 结论

我们不必成为技术的奴隶，而应成为其**明智的主人**。通过深度思考和有意识的选择，我们可以创造更有意义的生活体验。

![平衡的生活](https://via.placeholder.com/300x150?text=平衡的生活)

*希望这些思考能为你带来启发!*`
};

const MarkdownTest: React.FC = () => {
  const [markdownInput, setMarkdownInput] = useState<string>(MARKDOWN_EXAMPLES.basic);

  const handleExampleChange = (value: string) => {
    setMarkdownInput(MARKDOWN_EXAMPLES[value as keyof typeof MARKDOWN_EXAMPLES]);
  };

  return (
    <Container>
      <Title level={2}>Markdown格式测试</Title>
      <Paragraph>
        编辑或选择示例预览Markdown格式效果
      </Paragraph>

      <Space style={{ marginBottom: '1rem' }}>
        <span>选择示例:</span>
        <Select 
          defaultValue="basic" 
          style={{ width: 200 }} 
          onChange={handleExampleChange}
        >
          <Option value="basic">基础示例</Option>
          <Option value="rich">富文本示例</Option>
        </Select>
      </Space>

      <StyledCard>
        <TextArea
          value={markdownInput}
          onChange={(e) => setMarkdownInput(e.target.value)}
          placeholder="输入Markdown内容..."
          autoSize={{ minRows: 10, maxRows: 20 }}
        />
      </StyledCard>

      <Divider>预览</Divider>

      <PreviewContainer>
        <MarkdownContent>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {markdownInput}
          </ReactMarkdown>
        </MarkdownContent>
      </PreviewContainer>
    </Container>
  );
};

export default MarkdownTest; 