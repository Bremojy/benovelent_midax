import {
    useState,
    useRef,
} from "react";

import {
    Send,
    Image,
    Paperclip,
    Smile,
    Mic,
} from "lucide-react";

import "./MessageInput.css";

const API = import.meta.env.VITE_API_URL;

function MessageInput({

    onSend,
    socket,
    conversation,

}) {

    const [message, setMessage] =
        useState("");

    const [image, setImage] =
        useState("");

    const fileInput =
        useRef(null);

    async function uploadImage(file) {

        const formData =
            new FormData();

        formData.append(
            "image",
            file
        );

        try {

            const token =
                localStorage.getItem(
                    "memberToken"
                );

            const response =
                await fetch(

                    `${API}/api/messages/upload`,

                    {

                        method:"POST",

                        headers:{

                            Authorization:
                            `Bearer ${token}`,

                        },

                        body:formData,

                    }

                );

            const data =
                await response.json();

            setImage(

                data.imageUrl

            );

        }

        catch(error){

            console.error(error);

        }

    }

    function handleKeyDown(e){

        if(

            e.key==="Enter"

            &&

            !e.shiftKey

        ){

            e.preventDefault();

            send();

        }

    }

    function send(){

        if(

            !message.trim()

            &&

            !image

        ) return;

        onSend(

            message,

            image

        );

        socket?.emit(

            "typing_stop",

            {

                conversationId:

                conversation._id,

            }

        );

        setMessage("");

        setImage("");

    }

    function typing(){

        socket?.emit(

            "typing",

            {

                conversationId:

                conversation._id,

            }

        );

    }

    return(

        <div className="message-input-container">

            {

                image &&

                (

                    <div className="preview-image">

                        <img

                            src={image}

                            alt=""

                        />

                        <button

                            onClick={()=>

                                setImage("")

                            }

                        >

                            ✕

                        </button>

                    </div>

                )

            }

            <div className="message-toolbar">

                <button

                    title="Emoji"

                >

                    <Smile size={21}/>

                </button>

                <button

                    onClick={()=>

                        fileInput.current.click()

                    }

                    title="Image"

                >

                    <Image size={21}/>

                </button>

                <button

                    title="Attachment"

                >

                    <Paperclip size={21}/>

                </button>

                <button

                    title="Voice"

                >

                    <Mic size={21}/>

                </button>

                <input

                    ref={fileInput}

                    hidden

                    type="file"

                    accept="image/*"

                    onChange={(e)=>{

                        if(

                            e.target.files[0]

                        ){

                            uploadImage(

                                e.target.files[0]

                            );

                        }

                    }}

                />

                <textarea

                    placeholder="Type a message..."

                    value={message}

                    onChange={(e)=>{

                        setMessage(

                            e.target.value

                        );

                        typing();

                    }}

                    onKeyDown={handleKeyDown}

                />

                <button

                    className="send-button"

                    onClick={send}

                >

                    <Send size={20}/>

                </button>

            </div>

        </div>

    );

}

export default MessageInput;