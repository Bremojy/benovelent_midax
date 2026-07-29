import {
    useState,
    useEffect,
    useRef,
} from "react";

import Picker from "emoji-picker-react";

import {
    Smile,
} from "lucide-react";

import "./EmojiPicker.css";


function EmojiPicker({

    onEmojiSelect,

}) {


    const [open, setOpen] = useState(false);


    const pickerRef = useRef(null);



    // Close picker when clicking outside

    useEffect(() => {


        function handleClickOutside(event){


            if(

                pickerRef.current &&

                !pickerRef.current.contains(
                    event.target
                )

            ){

                setOpen(false);

            }

        }


        document.addEventListener(

            "mousedown",

            handleClickOutside

        );


        return () => {


            document.removeEventListener(

                "mousedown",

                handleClickOutside

            );


        };


    },[]);




    function handleEmoji(event){


        onEmojiSelect(

            event.emoji

        );


    }



    return (

        <div

            className="emoji-wrapper"

            ref={pickerRef}

        >


            <button

                className="emoji-button"

                onClick={() =>
                    setOpen(!open)
                }

                type="button"

            >

                <Smile size={22}/>


            </button>



            {

                open && (

                    <div className="emoji-popup">


                        <Picker

                            onEmojiClick={
                                handleEmoji
                            }

                            previewConfig={{

                                showPreview:false

                            }}

                            searchDisabled={false}

                            width={320}

                            height={400}

                        />


                    </div>

                )

            }


        </div>

    );

}


export default EmojiPicker;