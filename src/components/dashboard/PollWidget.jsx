import { useEffect, useState } from "react";
import { Vote, CheckCircle2 } from "lucide-react";

import "./PollWidget.css";

const API = import.meta.env.VITE_API_URL;

function PollWidget() {

    const [poll, setPoll] = useState(null);

    const [loading, setLoading] = useState(true);

    const [selectedOption, setSelectedOption] = useState("");

    const [voting, setVoting] = useState(false);

    useEffect(() => {

        loadPoll();

    }, []);

    async function loadPoll() {

        try {

            const response = await fetch(
                `${API}/api/polls/active`
            );

            const data = await response.json();

            if (Array.isArray(data)) {

                setPoll(data[0]);

            } else {

                setPoll(data);

            }

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    async function vote() {

        if (!selectedOption) {

            alert("Please select an option.");

            return;

        }

        try {

            setVoting(true);

            const token = localStorage.getItem("memberToken");

            const response = await fetch(

                `${API}/api/votes`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type": "application/json",

                        Authorization: `Bearer ${token}`,

                    },

                    body: JSON.stringify({

                        pollId: poll._id,

                        option: selectedOption,

                    }),

                }

            );

            const data = await response.json();

            if (!response.ok) {

                alert(data.message);

                return;

            }

            alert("Vote submitted successfully.");

            loadPoll();

        } catch (error) {

            console.error(error);

        } finally {

            setVoting(false);

        }

    }

    if (loading) {

        return (

            <div className="poll-widget">

                Loading Poll...

            </div>

        );

    }

    if (!poll) {

        return (

            <div className="poll-widget">

                No active polls.

            </div>

        );

    }

    return (

        <div className="poll-widget">

            <div className="poll-header">

                <Vote size={28}/>

                <h2>

                    Active Poll

                </h2>

            </div>

            <h3>

                {poll.question}

            </h3>

            <div className="poll-options">

                {

                    poll.options.map((option,index)=>(

                        <label

                            key={index}

                            className="poll-option"

                        >

                            <input

                                type="radio"

                                name="poll"

                                value={option}

                                checked={

                                    selectedOption===option

                                }

                                onChange={(e)=>

                                    setSelectedOption(

                                        e.target.value

                                    )

                                }

                            />

                            {option}

                        </label>

                    ))

                }

            </div>

            <button

                className="vote-button"

                onClick={vote}

                disabled={voting}

            >

                <CheckCircle2 size={18}/>

                {

                    voting

                    ?

                    "Submitting..."

                    :

                    "Submit Vote"

                }

            </button>

        </div>

    );

}

export default PollWidget;