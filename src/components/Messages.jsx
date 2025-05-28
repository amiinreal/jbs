import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Messages.css';

const Messages = ({ currentUser }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const [participantsCache, setParticipantsCache] = useState({});
  const [loadingParticipants, setLoadingParticipants] = useState({});
  const [mobileView, setMobileView] = useState('conversations'); // 'conversations' or 'messages'

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser || !currentUser.id) {
        setError('User information not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/messages/conversations', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        
        const data = await response.json();
        
        // Process conversations to ensure other_user has a valid username
        const processedConversations = (data.data || []).map(conversation => {
          // Make sure other_user is an object with at least an id
          if (!conversation.other_user || typeof conversation.other_user !== 'object') {
            conversation.other_user = { id: 'unknown', username: 'Unknown User' };
          }
          
          // If id is missing or undefined, set a placeholder
          if (!conversation.other_user.id) {
            conversation.other_user.id = 'unknown';
          }
          
          // If username is missing, provide a default based on the id
          if (!conversation.other_user.username) {
            conversation.other_user.username = `User ${conversation.other_user.id}`;
          }
          
          return conversation;
        });
        
        setConversations(processedConversations);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations. Please try again later.');
        setLoading(false);
      }
    };

    fetchConversations();
  }, [currentUser]);

  // Fetch messages for active conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversation) return;
      
      try {
        const response = await fetch(`/api/messages/conversation/${activeConversation.id}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        
        const data = await response.json();
        setMessages(data.data || []);
        
        // Update mobile view to show messages when a conversation is selected
        setMobileView('messages');
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages for this conversation.');
      }
    };

    if (activeConversation) {
      fetchMessages();
    }
  }, [activeConversation]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation || !activeConversation.other_user) {
      return;
    }
    
    try {
      setSendingMessage(true);
      
      // Make sure other_user.id is a valid value
      const recipientId = activeConversation.other_user.id;
      if (!recipientId || recipientId === 'unknown') {
        throw new Error('Invalid recipient');
      }
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recipient_id: recipientId,
          content: newMessage,
          conversation_id: activeConversation.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Add new message to the list
      setMessages(prevMessages => [...prevMessages, data.data]);
      
      // Clear input
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return '';
    }
  };

  // Safely fetch and cache participant data
  const fetchParticipant = async (userId) => {
    // Skip invalid IDs
    if (!userId || userId === 'unknown') {
      return;
    }

    try {
      // Mark as loading
      setLoadingParticipants(prev => ({...prev, [userId]: true}));
      
      const response = await fetch(`/api/users/${userId}/public`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      const userData = await response.json();
      
      if (userData.success && userData.data) {
        // Make sure username is present
        if (!userData.data.username) {
          userData.data.username = `User ${userId}`;
        }
        
        // Update cache
        setParticipantsCache(prev => ({
          ...prev,
          [userId]: userData.data
        }));
      } else {
        throw new Error('Invalid user data');
      }
    } catch (err) {
      console.error(`Error fetching participant ${userId}:`, err);
      // Add a fallback entry
      setParticipantsCache(prev => ({
        ...prev,
        [userId]: { id: userId, username: `User ${userId}` }
      }));
    } finally {
      // Clear loading state
      setLoadingParticipants(prev => ({...prev, [userId]: false}));
    }
  };

  const getParticipantName = (conversation) => {
    if (!conversation || !conversation.other_user) {
      return 'Unknown User';
    }
    
    const userId = conversation.other_user.id;
    
    // If ID is invalid, return a default
    if (!userId || userId === 'unknown') {
      return 'Unknown User';
    }
    
    // If in cache, use the cached data
    if (participantsCache[userId]) {
      return participantsCache[userId].username || `User ${userId}`;
    }
    
    // If not in cache and not loading, fetch it
    if (!loadingParticipants[userId]) {
      fetchParticipant(userId);
    }
    
    // Return the name from conversation while loading
    return conversation.other_user.username || `User ${userId}`;
  };

  const renderConversationListItem = (conversation) => {
    // Skip rendering if conversation is invalid
    if (!conversation) {
      return null;
    }
    
    // Get participant name with fallback
    const participantName = getParticipantName(conversation);
    
    // Add listing preview if available
    let listingPreview = null;
    if (conversation.listing_type && conversation.listing_id) {
      const listingType = conversation.listing_type;
      const capitalized = listingType.charAt(0).toUpperCase() + listingType.slice(1);
      listingPreview = (
        <div className="listing-reference">
          <span className="listing-type">{capitalized}:</span>
          {conversation.listing_details?.title && (
            <span className="listing-title">{conversation.listing_details.title}</span>
          )}
        </div>
      );
    }
    
    return (
      <li 
        key={conversation.id} 
        className={`conversation-item ${activeConversation?.id === conversation.id ? 'active' : ''}`}
        onClick={() => setActiveConversation(conversation)}
      >
        <div className="conversation-avatar">
          {participantName.charAt(0).toUpperCase()}
        </div>
        
        <div className="conversation-info">
          <span className="conversation-name">
            {participantName}
          </span>
          <span className="conversation-preview">
            {conversation.last_message?.content 
              ? (conversation.last_message.content.length > 30 
                  ? `${conversation.last_message.content.substring(0, 30)}...` 
                  : conversation.last_message.content)
              : 'No messages yet'}
          </span>
          {listingPreview}
        </div>
        
        <div className="conversation-meta">
          <span className="conversation-time">
            {conversation.last_message ? formatDate(conversation.last_message.created_at) : ''}
          </span>
          {conversation.unread_count > 0 && (
            <span className="unread-count">{conversation.unread_count}</span>
          )}
        </div>
      </li>
    );
  };

  // Update the message bubble rendering to include listing references
  const renderMessageBubble = (message) => {
    const isSent = message.sender_id === currentUser.id;
    
    return (
      <div 
        key={message.id} 
        className={`message-bubble ${isSent ? 'sent' : 'received'}`}
      >
        <div className="message-content">
          {message.content}
          
          {/* Display listing reference if present */}
          {message.listing_details && (
            <div className="message-listing-reference">
              <div className="listing-reference-header">
                <i className="listing-icon"></i>
                <span>Regarding {message.listing_type || 'listing'}</span>
              </div>
              
              {message.listing_details.image_url && (
                <div className="listing-image-container">
                  <img 
                    src={message.listing_details.image_url} 
                    alt={message.listing_details.title || 'Listing'} 
                    className="listing-thumbnail"
                  />
                </div>
              )}
              
              <div className="listing-details">
                <h4>{message.listing_details.title || 'Untitled Listing'}</h4>
                {message.listing_details.price && (
                  <p className="listing-price">${message.listing_details.price.toLocaleString()}</p>
                )}
              </div>
              
              {message.listing_details.listing_url && (
                <a 
                  href={message.listing_details.listing_url} 
                  className="view-listing-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Listing
                </a>
              )}
            </div>
          )}
        </div>
        <div className="message-time">{formatDate(message.created_at)}</div>
      </div>
    );
  };

  const renderConversationHeader = () => {
    if (!activeConversation) return null;
    
    const participantName = getParticipantName(activeConversation);
    
    return (
      <div className="conversation-header">
        {mobileView === 'messages' && (
          <button 
            className="back-button"
            onClick={() => setMobileView('conversations')}
          >
            &larr; Back
          </button>
        )}
        
        <div className="conversation-info">
          <h2>{activeConversation.subject || 'Conversation'}</h2>
          <span className="participant">with {participantName}</span>
        </div>
      </div>
    );
  };

  // If user is not set, show an error
  if (!currentUser) {
    return (
      <div className="messages-container">
        <div className="messages-error">
          <h2>User Not Available</h2>
          <p>User information is not available. Please try logging in again.</p>
          <Link to="/login" className="retry-button">Go to Login</Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && conversations.length === 0) {
    return (
      <div className="messages-container">
        <h1 className="messages-title">Messages</h1>
        <div className="messages-loading">
          <div className="loading-spinner"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <h1 className="messages-title">Messages</h1>
      
      {error && (
        <div className="messages-error">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      )}
      
      <div className={`messages-content ${mobileView === 'conversations' ? 'show-conversations' : ''}`}>
        <div className="conversations-list">
          <h2>Conversations</h2>
          
          {conversations.length === 0 ? (
            <div className="no-conversations">
              <p>No conversations yet</p>
              <p className="no-convo-sub">
                When you message someone about a listing, it will appear here.
              </p>
            </div>
          ) : (
            <ul>
              {conversations.map(conversation => renderConversationListItem(conversation))}
            </ul>
          )}
        </div>
        
        <div className="messages-view">
          {!activeConversation ? (
            <div className="no-active-conversation">
              <div className="messages-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the list to view messages.</p>
            </div>
          ) : !activeConversation.other_user ? (
            <div className="no-active-conversation">
              <div className="messages-icon">⚠️</div>
              <h3>Conversation data is incomplete</h3>
              <p>There was a problem loading this conversation.</p>
              <button 
                onClick={() => window.location.reload()}
                className="retry-button"
              >
                Reload Messages
              </button>
            </div>
          ) : (
            <>
              {renderConversationHeader()}
              
              <div className="messages-body">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet</p>
                    <p>Start the conversation by sending a message below.</p>
                  </div>
                ) : (
                  <div className="messages-list">
                    {messages.map(message => renderMessageBubble(message))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              <div className="messages-footer">
                <form onSubmit={handleSendMessage} className="message-form">
                  <textarea 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows="3"
                    disabled={sendingMessage}
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;