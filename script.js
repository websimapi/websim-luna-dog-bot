import { config } from './config.js';
import * as tmi from 'tmi.js';

// Chat elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const twitchChannel = document.getElementById('twitchChannel');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');
const dogElement = document.querySelector('.dog');

// Chat history for context
let conversationHistory = [];
let twitchClient = null;

// Initialize the application
function init() {
    setupEventListeners();
    showWelcomeMessage();
}

// Setup event listeners
function setupEventListeners() {
    sendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
    connectButton.addEventListener('click', connectToTwitch);
    disconnectButton.addEventListener('click', disconnectFromTwitch);
}

// Show welcome message
function showWelcomeMessage() {
    addMessage("Woof woof! *tail wagging excitedly* Arf!", 'luna');
}

// Handle sending messages
async function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    chatInput.value = '';
    
    // Make Luna bark
    triggerBarkAnimation();
    
    // Get Luna's response
    const lunaResponse = await getLunaResponse(message);
    addMessage(lunaResponse, 'luna');
}

// Get Luna's response using LLM
async function getLunaResponse(userMessage) {
    // Add the message to conversation history
    const newMessage = {
        role: "user",
        content: userMessage,
    };
    conversationHistory.push(newMessage);
    
    // Only keep the last 10 messages for context
    conversationHistory = conversationHistory.slice(-10);
    
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: config.systemPrompt,
                },
                ...conversationHistory,
            ],
        });
        
        const response = completion.content;
        // Add the response to conversation history
        conversationHistory.push(completion);
        
        return response;
    } catch (error) {
        console.error("Error getting Luna's response:", error);
        return "Whine... *looks confused*";
    }
}

// Add a message to the chat interface
function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (sender === 'user') {
        messageElement.classList.add('user-message');
        messageElement.textContent = text;
    } else if (sender === 'luna') {
        messageElement.classList.add('luna-message');
        
        // Process the text to properly display markdown-style italics
        const processedText = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        messageElement.innerHTML = processedText;
    } else if (sender === 'twitch') {
        messageElement.classList.add('twitch-message');
        messageElement.innerHTML = `<strong>${text.username}:</strong> ${text.message}`;
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Limit the number of messages
    while (chatMessages.children.length > config.maxMessages) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

// Connect to Twitch chat
function connectToTwitch() {
    const channel = twitchChannel.value.trim();
    if (!channel) {
        addMessage("*whines* (Please enter a valid Twitch channel name)", 'luna');
        return;
    }
    
    // Create a new client
    twitchClient = new tmi.Client({
        connection: {
            secure: true,
            reconnect: true
        },
        channels: [channel]
    });
    
    // Register event handlers
    twitchClient.on('message', handleTwitchMessage);
    twitchClient.on('connected', handleTwitchConnected);
    twitchClient.on('disconnected', handleTwitchDisconnected);
    
    // Connect to Twitch
    twitchClient.connect().catch(error => {
        console.error('Error connecting to Twitch:', error);
        addMessage(`*sad whimper* (Failed to connect to Twitch: ${error.message})`, 'luna');
        setConnectionStatus(false);
    });
}

// Handle incoming Twitch messages
async function handleTwitchMessage(channel, tags, message, self) {
    // Skip messages from the bot itself
    if (self) return;
    
    // Add the Twitch message to the chat interface
    addMessage({username: tags['display-name'], message}, 'twitch');
    
    // Get Luna's response to the Twitch message
    const lunaResponse = await getLunaResponse(message);
    
    // Send Luna's response back to Twitch
    twitchClient.say(channel, lunaResponse).catch(error => {
        console.error('Error sending message to Twitch:', error);
    });
    
    // Also display Luna's response in our interface
    addMessage(lunaResponse, 'luna');
    triggerBarkAnimation();
}

// Handle successful Twitch connection
function handleTwitchConnected() {
    setConnectionStatus(true);
    addMessage(`*excited barking* (Connected to Twitch channel: ${twitchChannel.value})`, 'luna');
}

// Handle Twitch disconnection
function handleTwitchDisconnected() {
    setConnectionStatus(false);
    addMessage("*sad whimper* (Disconnected from Twitch)", 'luna');
}

// Disconnect from Twitch chat
function disconnectFromTwitch() {
    if (twitchClient) {
        twitchClient.disconnect().catch(error => {
            console.error('Error disconnecting from Twitch:', error);
        });
        twitchClient = null;
    }
}

// Update the connection status indicators
function setConnectionStatus(connected) {
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = `Connected to ${twitchChannel.value}`;
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        twitchChannel.disabled = true;
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        connectButton.disabled = false;
        disconnectButton.disabled = true;
        twitchChannel.disabled = false;
    }
}

// Trigger bark animation
function triggerBarkAnimation() {
    dogElement.classList.add('bark-animation');
    setTimeout(() => {
        dogElement.classList.remove('bark-animation');
    }, 300);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

