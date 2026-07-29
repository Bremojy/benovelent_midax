import "../../styles/member.css";

function ContributionHistory() {

  const history = [

    {
      date: "01 Jul 2026",
      amount: "KSh 500",
      status: "Paid",
    },

    {
      date: "01 Jun 2026",
      amount: "KSh 500",
      status: "Paid",
    },

    {
      date: "01 May 2026",
      amount: "KSh 500",
      status: "Paid",
    },

  ];

  return (

    <div className="history-card">

      <h3>Recent Contributions</h3>

      <table>

        <thead>

          <tr>

            <th>Date</th>

            <th>Amount</th>

            <th>Status</th>

          </tr>

        </thead>

        <tbody>

          {

            history.map((row, index) => (

              <tr key={index}>

                <td>{row.date}</td>

                <td>{row.amount}</td>

                <td>

                  <span className="paid-status">

                    {row.status}

                  </span>

                </td>

              </tr>

            ))

          }

        </tbody>

      </table>

    </div>

  );

}

export default ContributionHistory;