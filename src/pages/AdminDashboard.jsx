import { useEffect, useState } from "react";
import MembersManagement from "../components/MembersManagement";


import {
  LayoutDashboard,
  Image,
  Users,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Menu,
  X,
  LogOut,
  Plus,
  Heart,
  Globe,
  FileText,
  Phone,
  Wallet,
  TrendingUp,
  TrendingDown,
  HandHeart,
  UserRound,
  Settings,
  Search,
  Pencil,
  Save,
  XCircle,
  Activity,
  ShieldCheck,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

function AdminDashboard() {

  // =====================================================
  // GENERAL STATE
  // =====================================================

  const [activePage, setActivePage] =
    useState("dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // =====================================================
  // CAROUSEL STATE
  // =====================================================

  const [carousels, setCarousels] =
    useState([]);

  const [carouselLoading, setCarouselLoading] =
    useState(false);

  const [carouselFile, setCarouselFile] =
    useState(null);

  const [carouselForm, setCarouselForm] =
    useState({
      title: "",
      description: "",
      buttonText: "Discover More",
      buttonLink: "/about",
      order: 0,
    });

  // =====================================================
  // LEADERSHIP STATE
  // =====================================================

  const [leaders, setLeaders] =
    useState([]);

  const [leaderLoading, setLeaderLoading] =
    useState(false);

  const [leaderFile, setLeaderFile] =
    useState(null);

  const [leaderForm, setLeaderForm] =
    useState({
      name: "",
      position: "",
      bio: "",
      order: 0,
    });

  // =====================================================
  // WEBSITE CONTENT STATE
  // =====================================================

  const [websiteContent, setWebsiteContent] =
    useState({
      homeTitle:
        "Standing Together. Supporting One Another.",

      homeDescription:
        "A community dedicated to supporting our members and their families during life's most difficult moments.",

      aboutTitle:
        "Together, We Stand Stronger",

      aboutText:
        "Benevolent Midax is committed to creating a supportive community where members and their families can find assistance during challenging times.",

      mission:
        "To provide compassionate and responsible support to eligible members and their families during difficult moments.",

      vision:
        "To build a united and supportive community where no member faces life's challenges alone.",

      servicesIntro:
        "Our scheme is designed to provide support to eligible members and their families.",

      contactPhone:
        "+254 700 000 000",

      contactEmail:
        "info@benevolentmidax.com",

      contactAddress:
        "Nairobi, Kenya",
    });

  const [editingContent, setEditingContent] =
    useState(false);

  // =====================================================
  // FINANCIAL STATE
  // =====================================================

  const [transactions, setTransactions] =
    useState([
      {
        id: 1,
        date: "2026-07-01",
        description:
          "Member Monthly Contributions",
        type: "Contribution",
        amount: 250000,
      },

      {
        id: 2,
        date: "2026-07-05",
        description:
          "Medical Assistance",
        type: "Payout",
        amount: 30000,
      },

      {
        id: 3,
        date: "2026-07-10",
        description:
          "Funeral Assistance",
        type: "Payout",
        amount: 50000,
      },
    ]);

  const [transactionForm, setTransactionForm] =
    useState({
      description: "",
      type: "Contribution",
      amount: "",
    });

  // =====================================================
  // MEMBERS STATE
  // =====================================================

  
  // =====================================================
  // CLAIMS STATE
  // =====================================================

  const [claims, setClaims] =
    useState([
      {
        id: 1,
        member: "John Mwangi",
        type: "Medical Assistance",
        amount: 50000,
        status: "Pending",
      },

      {
        id: 2,
        member: "Mary Wanjiku",
        type: "Funeral Assistance",
        amount: 40000,
        status: "Approved",
      },
    ]);

  // =====================================================
  // FETCH CAROUSELS
  // =====================================================

  const fetchCarousels = async () => {

    try {

      const response =
        await fetch(
          `${API_URL}/carousel`
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to load carousels"
        );

      }

      setCarousels(data);

    } catch (error) {

      console.error(
        "Carousel error:",
        error
      );

    }

  };

  // =====================================================
  // FETCH LEADERS
  // =====================================================

  const fetchLeaders = async () => {

    try {

      const response =
        await fetch(
          `${API_URL}/leaders`
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to load leaders"
        );

      }

      setLeaders(data);

    } catch (error) {

      console.error(
        "Leader error:",
        error
      );

    }

  };

  // =====================================================
  // LOAD INITIAL DATA
  // =====================================================

  useEffect(() => {

    fetchCarousels();

    fetchLeaders();

  }, []);

  // =====================================================
  // NAVIGATION
  // =====================================================

  const navigateTo = (page) => {

    setActivePage(page);

    setSidebarOpen(false);

  };

  // =====================================================
  // CAROUSEL INPUT
  // =====================================================

  const handleCarouselChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setCarouselForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

  };

  // =====================================================
  // LEADER INPUT
  // =====================================================

  const handleLeaderChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setLeaderForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

  };


  

  // =====================================================
  // WEBSITE CONTENT INPUT
  // =====================================================

  const handleContentChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setWebsiteContent(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

  };

  // =====================================================
  // UPLOAD CAROUSEL
  // =====================================================

  const uploadCarousel = async (e) => {

    e.preventDefault();

    if (!carouselFile) {

      alert(
        "Please select a carousel image."
      );

      return;

    }

    try {

      setCarouselLoading(true);

      const formData =
        new FormData();

      formData.append(
        "image",
        carouselFile
      );

      formData.append(
        "title",
        carouselForm.title
      );

      formData.append(
        "description",
        carouselForm.description
      );

      formData.append(
        "buttonText",
        carouselForm.buttonText
      );

      formData.append(
        "buttonLink",
        carouselForm.buttonLink
      );

      formData.append(
        "order",
        carouselForm.order
      );

      const response =
        await fetch(
          `${API_URL}/carousel/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Carousel upload failed"
        );

      }

      alert(
        "Carousel uploaded successfully!"
      );

      setCarouselFile(null);

      setCarouselForm({
        title: "",
        description: "",
        buttonText:
          "Discover More",
        buttonLink:
          "/about",
        order: 0,
      });

      fetchCarousels();

    } catch (error) {

      console.error(error);

      alert(error.message);

    } finally {

      setCarouselLoading(false);

    }

  };

  // =====================================================
  // DELETE CAROUSEL
  // =====================================================

  const deleteCarousel = async (id) => {

    if (
      !window.confirm(
        "Are you sure you want to delete this carousel?"
      )
    ) {

      return;

    }

    try {

      const response =
        await fetch(
          `${API_URL}/carousel/${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to delete carousel"
        );

      }

      setCarousels(
        (previous) =>
          previous.filter(
            (item) =>
              item._id !== id
          )
      );

      alert(
        "Carousel deleted successfully."
      );

    } catch (error) {

      console.error(error);

      alert(error.message);

    }

  };

  // =====================================================
  // TOGGLE CAROUSEL
  // =====================================================

  const toggleCarousel = async (
    carousel
  ) => {

    try {

      const response =
        await fetch(
          `${API_URL}/carousel/${carousel._id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              isActive:
                !carousel.isActive,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to update carousel"
        );

      }

      setCarousels(
        (previous) =>
          previous.map(
            (item) =>
              item._id ===
              carousel._id
                ? data.slide
                : item
          )
      );

    } catch (error) {

      console.error(error);

      alert(error.message);

    }

  };

  // =====================================================
  // ADD LEADER
  // =====================================================

  const addLeader = async (e) => {

    e.preventDefault();

    if (
      !leaderForm.name ||
      !leaderForm.position
    ) {

      alert(
        "Please enter leader name and position."
      );

      return;

    }

    try {

      setLeaderLoading(true);

      const formData =
        new FormData();

      formData.append(
        "name",
        leaderForm.name
      );

      formData.append(
        "position",
        leaderForm.position
      );

      formData.append(
        "bio",
        leaderForm.bio
      );

      formData.append(
        "order",
        leaderForm.order
      );

      if (leaderFile) {

        formData.append(
          "image",
          leaderFile
        );

      }

      const response =
        await fetch(
          `${API_URL}/leaders/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to add leader"
        );

      }

      alert(
        "Leader added successfully!"
      );

      setLeaderForm({
        name: "",
        position: "",
        bio: "",
        order: 0,
      });

      setLeaderFile(null);

      fetchLeaders();

    } catch (error) {

      console.error(error);

      alert(error.message);

    } finally {

      setLeaderLoading(false);

    }

  };

  // =====================================================
  // DELETE LEADER
  // =====================================================

  const deleteLeader = async (id) => {

    if (
      !window.confirm(
        "Are you sure you want to delete this leader?"
      )
    ) {

      return;

    }

    try {

      const response =
        await fetch(
          `${API_URL}/leaders/${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to delete leader"
        );

      }

      setLeaders(
        (previous) =>
          previous.filter(
            (item) =>
              item._id !== id
          )
      );

      alert(
        "Leader deleted successfully."
      );

    } catch (error) {

      console.error(error);

      alert(error.message);

    }

  };

  // =====================================================
  // TOGGLE LEADER
  // =====================================================

  const toggleLeader = async (
    leader
  ) => {

    try {

      const response =
        await fetch(
          `${API_URL}/leaders/${leader._id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              isActive:
                !leader.isActive,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to update leader"
        );

      }

      setLeaders(
        (previous) =>
          previous.map(
            (item) =>
              item._id ===
              leader._id
                ? data.leader
                : item
          )
      );

    } catch (error) {

      console.error(error);

      alert(error.message);

    }

  };

  // =====================================================
  // ADD FINANCIAL TRANSACTION
  // =====================================================

  const addTransaction = (e) => {

    e.preventDefault();

    if (
      !transactionForm.description ||
      !transactionForm.amount
    ) {

      alert(
        "Please complete the transaction details."
      );

      return;

    }

    const newTransaction = {

      id:
        Date.now(),

      date:
        new Date()
          .toISOString()
          .split("T")[0],

      description:
        transactionForm.description,

      type:
        transactionForm.type,

      amount:
        Number(
          transactionForm.amount
        ),

    };

    setTransactions(
      (previous) => [
        newTransaction,
        ...previous,
      ]
    );

    setTransactionForm({
      description: "",
      type:
        "Contribution",
      amount: "",
    });

  };

  // =====================================================
  // DELETE TRANSACTION
  // =====================================================

  const deleteTransaction = (id) => {

    if (
      !window.confirm(
        "Delete this financial transaction?"
      )
    ) {

      return;

    }

    setTransactions(
      (previous) =>
        previous.filter(
          (item) =>
            item.id !== id
        )
    );

  };

  // =====================================================
  // CLAIM STATUS
  // =====================================================

  const updateClaimStatus = (
    id,
    status
  ) => {

    setClaims(
      (previous) =>
        previous.map(
          (claim) =>
            claim.id === id
              ? {
                  ...claim,
                  status,
                }
              : claim
        )
    );

  };

  // =====================================================
  // FINANCIAL CALCULATIONS
  // =====================================================

  const totalContributions =
    transactions
      .filter(
        (item) =>
          item.type ===
          "Contribution"
      )
      .reduce(
        (total, item) =>
          total +
          Number(item.amount),
        0
      );

  const totalPayouts =
    transactions
      .filter(
        (item) =>
          item.type ===
          "Payout"
      )
      .reduce(
        (total, item) =>
          total +
          Number(item.amount),
        0
      );

  const totalExpenses =
    transactions
      .filter(
        (item) =>
          item.type ===
          "Expense"
      )
      .reduce(
        (total, item) =>
          total +
          Number(item.amount),
        0
      );

  const currentBalance =
    totalContributions -
    totalPayouts -
    totalExpenses;

  

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {

    localStorage.removeItem(
      "adminToken"
    );

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "auth_role"
    );

    window.location.href =
      "/login";

  };

  // =====================================================
  // PAGE TITLE
  // =====================================================

  const getPageTitle = () => {

    const titles = {

      dashboard:
        "Dashboard",

      content:
        "Website Content",

      carousel:
        "Carousel Management",

      leaders:
        "Leadership Management",

      members:
        "Member Management",

      finances:
        "Financial Tracking",

      claims:
        "Assistance & Claims",

      contact:
        "Contact Information",

      settings:
        "System Settings",

    };

    return (
      titles[activePage] ||
      "Dashboard"
    );

  };

  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="admin-layout">

      {/* =========================================
          MOBILE MENU
      ========================================= */}

      <button
        className="admin-menu-button"
        onClick={() =>
          setSidebarOpen(
            !sidebarOpen
          )
        }
      >

        {sidebarOpen ? (
          <X size={22} />
        ) : (
          <Menu size={22} />
        )}

      </button>


      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside
        className={
          `admin-sidebar ${
            sidebarOpen
              ? "open"
              : ""
          }`
        }
      >

        <div className="admin-logo">

          <h2>
            Benevolent
          </h2>

          <span>
            MIDAX ADMIN
          </span>

        </div>


        <nav className="admin-nav">

          {/* DASHBOARD */}

          <button
            className={
              activePage ===
              "dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "dashboard"
              )
            }
          >

            <LayoutDashboard
              size={20}
            />

            Dashboard

          </button>


          {/* WEBSITE */}

          <div className="admin-nav-label">
            WEBSITE MANAGEMENT
          </div>


          <button
            className={
              activePage ===
              "content"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "content"
              )
            }
          >

            <Globe size={20} />

            Website Content

          </button>


          <button
            className={
              activePage ===
              "carousel"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "carousel"
              )
            }
          >

            <Image size={20} />

            Homepage Carousel

          </button>


          <button
            className={
              activePage ===
              "leaders"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "leaders"
              )
            }
          >

            <Users size={20} />

            Leadership

          </button>


          {/* SCHEME MANAGEMENT */}

          <div className="admin-nav-label">
            SCHEME MANAGEMENT
          </div>


          <button
            className={
              activePage ===
              "members"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "members"
              )
            }
          >

            <UserRound size={20} />

            Members

          </button>


          <button
            className={
              activePage ===
              "finances"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "finances"
              )
            }
          >

            <Wallet size={20} />

            Financial Tracking

          </button>


          <button
            className={
              activePage ===
              "claims"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "claims"
              )
            }
          >

            <HandHeart size={20} />

            Assistance & Claims

          </button>


          {/* SYSTEM */}

          <div className="admin-nav-label">
            SYSTEM
          </div>


          <button
            className={
              activePage ===
              "contact"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "contact"
              )
            }
          >

            <Phone size={20} />

            Contact Details

          </button>


          <button
            className={
              activePage ===
              "settings"
                ? "active"
                : ""
            }
            onClick={() =>
              navigateTo(
                "settings"
              )
            }
          >

            <Settings size={20} />

            Settings

          </button>

        </nav>


        <button
          className="admin-logout"
          onClick={logout}
        >

          <LogOut size={20} />

          Logout

        </button>

      </aside>


      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="admin-main">


        {/* HEADER */}

        <header className="admin-header">

          <div>

            <p>
              BENEVOLENT MIDAX
            </p>

            <h1>
              {getPageTitle()}
            </h1>

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


        {/* =========================================
            DASHBOARD
        ========================================= */}

        {activePage ===
          "dashboard" && (

          <div className="dashboard-content">

            <div className="welcome-box">

              <p className="section-label">
                ADMINISTRATION
              </p>

              <h2>
                Welcome to Benevolent Midax
              </h2>

              <p>
                Manage your benevolent scheme,
                website content, members,
                finances and assistance
                requests from one place.
              </p>

            </div>


            <div className="admin-stats">


              <div className="admin-stat-card">

                <Users />

                <div>

                  <span>
                    Total Members
                  </span>

                  <strong>
                    0
                  </strong>

                </div>

              </div>


              <div className="admin-stat-card">

                <TrendingUp />

                <div>

                  <span>
                    Contributions
                  </span>

                  <strong>
                    KSh{" "}
                    {totalContributions.toLocaleString()}
                  </strong>

                </div>

              </div>


              <div className="admin-stat-card">

                <TrendingDown />

                <div>

                  <span>
                    Assistance Paid
                  </span>

                  <strong>
                    KSh{" "}
                    {totalPayouts.toLocaleString()}
                  </strong>

                </div>

              </div>


              <div className="admin-stat-card">

                <Wallet />

                <div>

                  <span>
                    Current Balance
                  </span>

                  <strong>
                    KSh{" "}
                    {currentBalance.toLocaleString()}
                  </strong>

                </div>

              </div>

            </div>


            <div className="quick-actions">

              <h2>
                Quick Actions
              </h2>


              <div className="quick-grid">


                <button
                  onClick={() =>
                    navigateTo(
                      "content"
                    )
                  }
                >

                  <Globe size={25} />

                  <span>
                    Edit Website
                  </span>

                </button>


                <button
                  onClick={() =>
                    navigateTo(
                      "finances"
                    )
                  }
                >

                  <Wallet size={25} />

                  <span>
                    Track Funds
                  </span>

                </button>


                <button
                  onClick={() =>
                    navigateTo(
                      "claims"
                    )
                  }
                >

                  <HandHeart size={25} />

                  <span>
                    Review Claims
                  </span>

                </button>


                <button
                  onClick={() =>
                    navigateTo(
                      "members"
                    )
                  }
                >

                  <Users size={25} />

                  <span>
                    Manage Members
                  </span>

                </button>

              </div>

            </div>

          </div>

        )}


        {/* =========================================
            WEBSITE CONTENT
        ========================================= */}

        {activePage ===
          "content" && (

          <section className="admin-section">

            <div className="section-header-row">

              <div>

                <h2>
                  Website Content
                </h2>

                <p>
                  Update the information
                  displayed across your
                  public website.
                </p>

              </div>


              <button
                className="save-button"
                onClick={() =>
                  setEditingContent(
                    !editingContent
                  )
                }
              >

                {editingContent ? (
                  <>
                    <XCircle size={18} />
                    Cancel Editing
                  </>
                ) : (
                  <>
                    <Pencil size={18} />
                    Edit Website
                  </>
                )}

              </button>

            </div>


            <div className="content-editor">


              <h3>
                Homepage
              </h3>


              <label>
                Homepage Title
              </label>

              <input
                name="homeTitle"
                value={
                  websiteContent.homeTitle
                }
                onChange={
                  handleContentChange
                }
                disabled={
                  !editingContent
                }
              />


              <label>
                Homepage Description
              </label>

              <textarea
                name="homeDescription"
                value={
                  websiteContent.homeDescription
                }
                onChange={
                  handleContentChange
                }
                disabled={
                  !editingContent
                }
                rows="4"
              />


              <h3>
                About Us
              </h3>


              <label>
                About Title
              </label>

              <input
                name="aboutTitle"
                value={
                  websiteContent.aboutTitle
                }
                onChange={
                  handleContentChange
                }
                disabled={
                  !editingContent
                }
              />


              <label>
                About Description
              </label>

              <textarea
                name="aboutText"
                value={
                  websiteContent.aboutText
                }
                onChange={
                  handleContentChange
                }
                disabled={
                  !editingContent
                }
                rows="5"
              />


              <label>
                Mission
              </label>

              <textarea
                name="mission"
                value={
                  websiteContent.mission
                }
                onChange={
                  handleContentChange
                }
                disabled={
                  !editingContent
                }
                rows="4"
              />


              <label>
                Vision
              </label>

              <textarea
                name="vision"
                value={
                  websiteContent.vision
                }
                onChange={
                  handleContentChange
                }
                disabled={
                  !editingContent
                }
                rows="4"
              />


              <h3>
                Services
              </h3>


              <label>
                Services Introduction
              </label>

              <textarea
                name="servicesIntro"
                value={
                  websiteContent.servicesIntro
                }
                onChange={
                  handleContentChange
                }
                disabled={
                  !editingContent
                }
                rows="4"
              />


              {editingContent && (

                <button
                  className="save-button"
                  onClick={() => {

                    setEditingContent(
                      false
                    );

                    alert(
                      "Content updated locally. Next we will connect this to MongoDB."
                    );

                  }}
                >

                  <Save size={18} />

                  Save Website Content

                </button>

              )}

            </div>

          </section>

        )}


        {/* =========================================
            CAROUSEL
        ========================================= */}

        {activePage ===
          "carousel" && (

          <section className="admin-section">

            <h2>
              Homepage Carousel
            </h2>

            <p>
              Manage the images displayed
              on your homepage.
            </p>


            <form
              onSubmit={
                uploadCarousel
              }
            >

              <label>
                Carousel Title
              </label>

              <input
                type="text"
                name="title"
                value={
                  carouselForm.title
                }
                onChange={
                  handleCarouselChange
                }
                required
              />


              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  carouselForm.description
                }
                onChange={
                  handleCarouselChange
                }
                rows="4"
              />


              <label>
                Button Text
              </label>

              <input
                name="buttonText"
                value={
                  carouselForm.buttonText
                }
                onChange={
                  handleCarouselChange
                }
              />


              <label>
                Button Link
              </label>

              <input
                name="buttonLink"
                value={
                  carouselForm.buttonLink
                }
                onChange={
                  handleCarouselChange
                }
              />


              <label>
                Display Order
              </label>

              <input
                type="number"
                name="order"
                value={
                  carouselForm.order
                }
                onChange={
                  handleCarouselChange
                }
              />


              <div className="upload-box">

                <Upload size={40} />

                <h3>
                  Upload Carousel Image
                </h3>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setCarouselFile(
                      e.target.files[0]
                    )
                  }
                />

              </div>


              <button
                className="save-button"
                type="submit"
                disabled={
                  carouselLoading
                }
              >

                {carouselLoading
                  ? "Uploading..."
                  : "Upload Carousel"}

              </button>

            </form>


            <h2 className="sub-section-title">
              Existing Carousels
            </h2>


            <div className="admin-card-grid">

              {carousels.map(
                (carousel) => (

                  <div
                    className="admin-item-card"
                    key={
                      carousel._id
                    }
                  >

                    <img
                      src={
                        carousel.imageUrl
                      }
                      alt={
                        carousel.title
                      }
                    />


                    <div>

                      <h3>
                        {
                          carousel.title
                        }
                      </h3>

                      <p>
                        {
                          carousel.description
                        }
                      </p>


                      <span
                        className={
                          carousel.isActive
                            ? "status-active"
                            : "status-inactive"
                        }
                      >

                        {carousel.isActive
                          ? "Active"
                          : "Inactive"}

                      </span>


                      <div className="item-actions">

                        <button
                          onClick={() =>
                            toggleCarousel(
                              carousel
                            )
                          }
                        >

                          {carousel.isActive ? (
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}

                        </button>


                        <button
                          className="danger-button"
                          onClick={() =>
                            deleteCarousel(
                              carousel._id
                            )
                          }
                        >

                          <Trash2
                            size={17}
                          />

                        </button>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </section>

        )}


        {/* =========================================
            LEADERS
        ========================================= */}

        {activePage ===
          "leaders" && (

          <section className="admin-section">

            <h2>
              Leadership Management
            </h2>

            <p>
              Manage the people displayed
              on the public leadership page.
            </p>


            <form
              onSubmit={
                addLeader
              }
            >

              <label>
                Leader Name
              </label>

              <input
                name="name"
                value={
                  leaderForm.name
                }
                onChange={
                  handleLeaderChange
                }
                required
              />


              <label>
                Position
              </label>

              <input
                name="position"
                value={
                  leaderForm.position
                }
                onChange={
                  handleLeaderChange
                }
                required
              />


              <label>
                Biography
              </label>

              <textarea
                name="bio"
                value={
                  leaderForm.bio
                }
                onChange={
                  handleLeaderChange
                }
                rows="4"
              />


              <label>
                Display Order
              </label>

              <input
                type="number"
                name="order"
                value={
                  leaderForm.order
                }
                onChange={
                  handleLeaderChange
                }
              />


              <div className="upload-box">

                <Users size={40} />

                <h3>
                  Upload Leader Photo
                </h3>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setLeaderFile(
                      e.target.files[0]
                    )
                  }
                />

              </div>


              <button
                className="save-button"
                type="submit"
                disabled={
                  leaderLoading
                }
              >

                {leaderLoading
                  ? "Adding..."
                  : "Add Leader"}

              </button>

            </form>


            <h2 className="sub-section-title">
              Existing Leaders
            </h2>


            <div className="admin-card-grid">

              {leaders.map(
                (leader) => (

                  <div
                    className="admin-item-card"
                    key={
                      leader._id
                    }
                  >

                    {leader.imageUrl && (

                      <img
                        src={
                          leader.imageUrl
                        }
                        alt={
                          leader.name
                        }
                      />

                    )}


                    <div>

                      <h3>
                        {
                          leader.name
                        }
                      </h3>

                      <p>
                        {
                          leader.position
                        }
                      </p>

                      <p>
                        {
                          leader.bio
                        }
                      </p>


                      <div className="item-actions">

                        <button
                          onClick={() =>
                            toggleLeader(
                              leader
                            )
                          }
                        >

                          {leader.isActive ? (
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}

                        </button>


                        <button
                          className="danger-button"
                          onClick={() =>
                            deleteLeader(
                              leader._id
                            )
                          }
                        >

                          <Trash2
                            size={17}
                          />

                        </button>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </section>

        )}

        {/* =========================================
    MEMBERS
========================================= */}

{activePage === "members" && (
  <MembersManagement />
)}




        {/* =========================================
            FINANCIAL TRACKING
        ========================================= */}

        {activePage ===
          "finances" && (

          <section className="admin-section">

            <h2>
              Financial Tracking
            </h2>

            <p>
              Track member contributions,
              assistance payouts and
              scheme expenses.
            </p>


            <div className="finance-stats">


              <div className="finance-card">

                <TrendingUp />

                <span>
                  Total Contributions
                </span>

                <strong>
                  KSh{" "}
                  {totalContributions.toLocaleString()}
                </strong>

              </div>


              <div className="finance-card">

                <HandHeart />

                <span>
                  Assistance Paid
                </span>

                <strong>
                  KSh{" "}
                  {totalPayouts.toLocaleString()}
                </strong>

              </div>


              <div className="finance-card">

                <TrendingDown />

                <span>
                  Other Expenses
                </span>

                <strong>
                  KSh{" "}
                  {totalExpenses.toLocaleString()}
                </strong>

              </div>


              <div className="finance-card balance">

                <Wallet />

                <span>
                  Current Balance
                </span>

                <strong>
                  KSh{" "}
                  {currentBalance.toLocaleString()}
                </strong>

              </div>

            </div>


            <div className="content-editor">

              <h3>
                Add Financial Transaction
              </h3>


              <form
                onSubmit={
                  addTransaction
                }
              >

                <label>
                  Description
                </label>

                <input
                  value={
                    transactionForm.description
                  }
                  onChange={(e) =>
                    setTransactionForm(
                      {
                        ...transactionForm,
                        description:
                          e.target.value,
                      }
                    )
                  }
                  placeholder="e.g. August member contributions"
                />


                <label>
                  Transaction Type
                </label>

                <select
                  value={
                    transactionForm.type
                  }
                  onChange={(e) =>
                    setTransactionForm(
                      {
                        ...transactionForm,
                        type:
                          e.target.value,
                      }
                    )
                  }
                >

                  <option>
                    Contribution
                  </option>

                  <option>
                    Payout
                  </option>

                  <option>
                    Expense
                  </option>

                </select>


                <label>
                  Amount (KSh)
                </label>

                <input
                  type="number"
                  value={
                    transactionForm.amount
                  }
                  onChange={(e) =>
                    setTransactionForm(
                      {
                        ...transactionForm,
                        amount:
                          e.target.value,
                      }
                    )
                  }
                />


                <button
                  className="save-button"
                  type="submit"
                >

                  <Plus size={18} />

                  Add Transaction

                </button>

              </form>

            </div>


            <h2 className="sub-section-title">
              Transaction History
            </h2>


            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      Date
                    </th>

                    <th>
                      Description
                    </th>

                    <th>
                      Type
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {transactions.map(
                    (transaction) => (

                      <tr
                        key={
                          transaction.id
                        }
                      >

                        <td>
                          {
                            transaction.date
                          }
                        </td>

                        <td>
                          {
                            transaction.description
                          }
                        </td>

                        <td>
                          {
                            transaction.type
                          }
                        </td>

                        <td>
                          KSh{" "}
                          {Number(
                            transaction.amount
                          ).toLocaleString()}
                        </td>

                        <td>

                          <button
                            className="danger-button"
                            onClick={() =>
                              deleteTransaction(
                                transaction.id
                              )
                            }
                          >

                            <Trash2
                              size={17}
                            />

                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

        )}


        {/* =========================================
            CLAIMS
        ========================================= */}

        {activePage ===
          "claims" && (

          <section className="admin-section">

            <h2>
              Assistance & Claims
            </h2>

            <p>
              Review member requests for
              medical, funeral and other
              eligible assistance.
            </p>


            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      Member
                    </th>

                    <th>
                      Request
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {claims.map(
                    (claim) => (

                      <tr
                        key={
                          claim.id
                        }
                      >

                        <td>
                          {
                            claim.member
                          }
                        </td>

                        <td>
                          {
                            claim.type
                          }
                        </td>

                        <td>
                          KSh{" "}
                          {claim.amount.toLocaleString()}
                        </td>

                        <td>
                          {
                            claim.status
                          }
                        </td>

                        <td>

                          <div className="claim-actions">

                            {claim.status ===
                              "Pending" && (

                              <>

                                <button
                                  onClick={() =>
                                    updateClaimStatus(
                                      claim.id,
                                      "Approved"
                                    )
                                  }
                                >
                                  Approve
                                </button>

                                <button
                                  className="danger-button"
                                  onClick={() =>
                                    updateClaimStatus(
                                      claim.id,
                                      "Rejected"
                                    )
                                  }
                                >
                                  Reject
                                </button>

                              </>

                            )}


                            {claim.status ===
                              "Approved" && (

                              <button
                                onClick={() =>
                                  updateClaimStatus(
                                    claim.id,
                                    "Paid"
                                  )
                                }
                              >
                                Mark as Paid
                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

        )}


        {/* =========================================
            CONTACT
        ========================================= */}

        {activePage ===
          "contact" && (

          <section className="admin-section">

            <h2>
              Contact Information
            </h2>

            <p>
              Manage the contact details
              shown on the public website.
            </p>


            <div className="content-editor">

              <label>
                Phone Number
              </label>

              <input
                name="contactPhone"
                value={
                  websiteContent.contactPhone
                }
                onChange={
                  handleContentChange
                }
              />


              <label>
                Email Address
              </label>

              <input
                name="contactEmail"
                value={
                  websiteContent.contactEmail
                }
                onChange={
                  handleContentChange
                }
              />


              <label>
                Office Address
              </label>

              <textarea
                name="contactAddress"
                value={
                  websiteContent.contactAddress
                }
                onChange={
                  handleContentChange
                }
                rows="4"
              />


              <button
                className="save-button"
                onClick={() =>
                  alert(
                    "Contact details updated locally. We will connect this to MongoDB next."
                  )
                }
              >

                <Save size={18} />

                Save Contact Details

              </button>

            </div>

          </section>

        )}


        {/* =========================================
            SETTINGS
        ========================================= */}

        {activePage ===
          "settings" && (

          <section className="admin-section">

            <h2>
              System Settings
            </h2>

            <p>
              Manage your administrator
              account and system preferences.
            </p>


            <div className="settings-card">

              <ShieldCheck size={40} />

              <h3>
                Administrator Account
              </h3>

              <p>
                Your administrator account
                controls access to the
                Benevolent Midax management
                system.
              </p>

              <button
                className="save-button"
                onClick={() =>
                  alert(
                    "Password management will be connected to the backend next."
                  )
                }
              >

                Change Password

              </button>

            </div>

          </section>

        )}

      </main>

    </div>

  );

}

export default AdminDashboard;