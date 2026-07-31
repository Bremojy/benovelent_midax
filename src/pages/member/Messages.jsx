import {
  useEffect,
  useState,
} from "react";

import { io } from "socket.io-client";

import DashboardLayout from "../../layouts/DashboardLayout";

import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";

import "./messages.css";

// ======================================================
// API / SOCKET CONFIG
// ======================================================

const API =
  import.meta.env.VITE_API_URL ||
  "https://benovelent-midax.onrender.com";


// ======================================================
// MESSAGES PAGE
// ======================================================

function Messages() {

  // ====================================================
  // STATE
  // ====================================================

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState(null);

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [
    socket,
    setSocket,
  ] = useState(null);

  const [
    mobileChatOpen,
    setMobileChatOpen,
  ] = useState(false);


  // ====================================================
  // LOAD CURRENT USER
  // ====================================================

  useEffect(() => {

    loadCurrentUser();

  }, []);


  async function loadCurrentUser() {

    try {

      const token =
        localStorage.getItem(
          "memberToken"
        );

      if (!token) {
        return;
      }

      const response =
        await fetch(
          `${API}/api/auth/me`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      setCurrentUser(
        data.user ||
        data.member ||
        data.data ||
        null
      );

    } catch (error) {

      console.error(
        "Load current user error:",
        error
      );

    }

  }


  // ====================================================
  // INITIALIZE SOCKET
  // ====================================================

  useEffect(() => {

    const token =
      localStorage.getItem(
        "memberToken"
      );

    if (!token) {
      return;
    }

    const newSocket =
      io(API, {
        transports: [
          "websocket",
          "polling",
        ],

        auth: {
          token,
        },

        query: {
          token,
        },
      });


    // -----------------------------------------------
    // SOCKET CONNECT
    // -----------------------------------------------

    newSocket.on(
      "connect",
      () => {

        console.log(
          "💬 Chat socket connected:",
          newSocket.id
        );

      }
    );


    // -----------------------------------------------
    // SOCKET ERROR
    // -----------------------------------------------

    newSocket.on(
      "connect_error",
      (error) => {

        console.error(
          "Chat socket connection error:",
          error
        );

      }
    );


    // -----------------------------------------------
    // SOCKET DISCONNECT
    // -----------------------------------------------

    newSocket.on(
      "disconnect",
      (reason) => {

        console.log(
          "Chat socket disconnected:",
          reason
        );

      }
    );


    setSocket(newSocket);


    // -----------------------------------------------
    // CLEANUP
    // -----------------------------------------------

    return () => {

      newSocket.disconnect();

      setSocket(null);

    };

  }, []);


  // ====================================================
  // SELECT CONVERSATION
  // ====================================================

  function handleSelectConversation(
    conversation
  ) {

    setSelectedConversation(
      conversation
    );

    // On phones, open chat window
    setMobileChatOpen(true);

  }


  // ====================================================
  // BACK TO CONVERSATIONS
  // ====================================================

  function handleBackToConversations() {

    setMobileChatOpen(false);

  }


  // ====================================================
  // RENDER
  // ====================================================

  return (

    <DashboardLayout>

      <div
        className={`
          messages-page
          ${
            mobileChatOpen
              ? "mobile-chat-open"
              : ""
          }
        `}
      >

        {/* ==========================================
            CONVERSATION SIDEBAR
        ========================================== */}

        <div
          className="messages-sidebar-container"
        >

          <ChatSidebar

            selectedConversation={
              selectedConversation
            }

            onSelectConversation={
              handleSelectConversation
            }

          />

        </div>


        {/* ==========================================
            CHAT WINDOW
        ========================================== */}

        <div
          className="messages-chat-container"
        >

          <ChatWindow

            conversation={
              selectedConversation
            }

            socket={
              socket
            }

            currentUser={
              currentUser
            }

            onBack={
              handleBackToConversations
            }

          />

        </div>

      </div>

    </DashboardLayout>

  );

}


export default Messages;