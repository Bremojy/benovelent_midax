import "./StatCard.css";

function StatCard({

    title,

    value,

    icon,

    color = "#ff7a00",

    subtitle = "",

    onClick,

}) {

    return (

        <div
            className="stat-card"
            onClick={onClick}
        >

            <div className="stat-top">

                <div
                    className="stat-icon"
                    style={{
                        background: color,
                    }}
                >
                    {icon}
                </div>

                <div className="stat-content">

                    <h4>{title}</h4>

                    <h2>{value}</h2>

                    {subtitle && (
                        <p>{subtitle}</p>
                    )}

                </div>

            </div>

        </div>

    );

}

export default StatCard;