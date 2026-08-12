import {
    Wallet,
    Calendar,
    TrendingUp,
    Download,
} from "lucide-react";

import "./ContributionCard.css";

function ContributionCard({

    monthlyContribution = 0,

    totalContribution = 0,

    lastPayment,

    contributionRate = 0,

    onDownload,

}) {

    return (

        <div className="contribution-card">

            <div className="contribution-header">

                <div>

                    <h2>

                        Contribution Summary

                    </h2>

                    <p>

                        Scheme-wide Benovelent MIDAX payroll contribution view

                    </p>

                </div>

                <Wallet
                    size={34}
                    className="wallet-icon"
                />

            </div>

            {/* Monthly */}

            <div className="contribution-row">

                <span>

                    Standard Monthly Deduction

                </span>

                <strong>

                    KSh {monthlyContribution.toLocaleString()}

                </strong>

            </div>

            {/* Total */}

            <div className="contribution-row">

                <span>

                    Scheme Contributions Collected

                </span>

                <strong>

                    KSh {totalContribution.toLocaleString()}

                </strong>

            </div>

            {/* Last Payment */}

            <div className="contribution-row">

                <span>

                    Last Payment

                </span>

                <strong>

                    {lastPayment
                        ? new Date(lastPayment).toLocaleDateString()
                        : "--"}

                </strong>

            </div>

            {/* Progress */}

            <div className="progress-container">

                <div className="progress-title">

                    <TrendingUp size={18}/>

                    Payment Progress

                </div>

                <div className="progress-bar">

                    <div

                        className="progress-fill"

                        style={{

                            width: `${contributionRate}%`,

                        }}

                    />

                </div>

                <small>

                    {contributionRate}% Completed

                </small>

            </div>

            <button

                className="download-btn"

                onClick={onDownload}

            >

                <Download size={18}/>

                Download Statement

            </button>

        </div>

    );

}

export default ContributionCard;