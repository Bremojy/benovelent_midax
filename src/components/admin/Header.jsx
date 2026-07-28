function Header({ getPageTitle }) {
  return (
    <header className="admin-header">

      <div>

        <p>BENEVOLENT MIDAX</p>

        <h1>{getPageTitle()}</h1>

      </div>

      <div className="admin-user">

        <div className="admin-avatar">
          B
        </div>

        <div>

          <strong>
            Administrator
          </strong>

          <span>
            System Admin
          </span>

        </div>

      </div>

    </header>
  );
}

export default Header;