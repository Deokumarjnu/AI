import React, { useState, useEffect, useRef } from 'react';
import './App.css';

type Message = {
  sender: 'user' | 'bot';
  text: string;
  sql?: string;
  isError?: boolean;
  timestamp?: Date;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Welcome to Kinvolved Education Analytics! 🎓\n\nI can help you analyze your education data. Try asking questions like:\n\n📊 **Analytics**\n• "How many students are in each district?"\n• "What\'s the overall attendance rate this month?"\n• "Show me districts with the highest engagement"\n\n👥 **Users & Enrollment**\n• "List all active districts"\n• "How many teachers are in the system?"\n• "Show me recent user enrollments"\n\n📱 **Communications**\n• "What\'s our messaging activity this week?"\n• "Show me recent notifications sent"\n• "Which districts send the most messages?"\n\n📈 **Reports**\n• "Show me attendance trends"\n• "List schools by district"\n• "What are the most active institutions?"',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { 
      sender: 'user', 
      text: input,
      timestamp: new Date()
    };
    setMessages(msgs => [...msgs, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:4000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        const botMsg: Message = { 
          sender: 'bot', 
          text: data.response,
          sql: data.sql,
          timestamp: new Date()
        };
        setMessages(msgs => [...msgs, botMsg]);
      } else {
        const errorMsg: Message = { 
          sender: 'bot', 
          text: data.error || 'Sorry, I encountered an error processing your request.',
          isError: true,
          timestamp: new Date()
        };
        setMessages(msgs => [...msgs, errorMsg]);
      }
    } catch (error) {
      const errorMsg: Message = { 
        sender: 'bot', 
        text: 'Sorry, I couldn\'t connect to the server. Please check if the backend is running.',
        isError: true,
        timestamp: new Date()
      };
      setMessages(msgs => [...msgs, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => (
      <div key={i}>{line}</div>
    ));
  };

  const formatTime = (timestamp?: Date) => {
    if (!timestamp) return '';
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickQuestions = [
    "List all districts",
    "How many students are enrolled?",
    "Show me today's attendance",
    "What's our messaging activity?",
    "Show me active institutions"
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="App">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-logo">
            <div className="logo-icon">🎓</div>
            <div className="header-text">
              <h1>Kinvolved Analytics</h1>
              <p>Education Data Intelligence Platform</p>
            </div>
          </div>
          <div className="header-status">
            <div className={`status-indicator ${isLoading ? 'processing' : 'ready'}`}></div>
            <span>{isLoading ? 'Processing...' : 'Ready'}</span>
          </div>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-container">
          {messages.map((msg, i) => (
            <div key={i} className={`message-wrapper ${msg.sender}`}>
              <div className={`message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                <div className="message-header">
                  <div className="message-avatar">
                    {msg.sender === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-info">
                    <strong>{msg.sender === 'user' ? 'You' : 'AI Analytics Assistant'}</strong>
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
                <div className="message-content">
                  {formatMessage(msg.text)}
                  {msg.sql && (
                    <details className="sql-details">
                      <summary>📊 View SQL Query</summary>
                      <div className="sql-code">
                        <code>{msg.sql}</code>
                        <button 
                          className="copy-button"
                          onClick={() => navigator.clipboard.writeText(msg.sql || '')}
                          title="Copy SQL"
                        >
                          📋
                        </button>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message-wrapper bot">
              <div className="message bot">
                <div className="message-header">
                  <div className="message-avatar">🤖</div>
                  <div className="message-info">
                    <strong>AI Analytics Assistant</strong>
                  </div>
                </div>
                <div className="message-content loading">
                  <div className="loading-animation">
                    <div className="loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="loading-text">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="quick-questions">
            <h3>💡 Try these questions:</h3>
            <div className="quick-buttons">
              {quickQuestions.map((question, i) => (
                <button
                  key={i}
                  className="quick-button"
                  onClick={() => handleQuickQuestion(question)}
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="input-container">
          <div className="input-wrapper">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
              className="chat-input"
              placeholder="Ask about your education data..."
            />
            <button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim()}
              className="send-button"
              title="Send message"
            >
              {isLoading ? '⏳' : '🚀'}
            </button>
          </div>
          <div className="input-footer">
            <span>Powered by Kinvolved AI • Connected to your education database</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
