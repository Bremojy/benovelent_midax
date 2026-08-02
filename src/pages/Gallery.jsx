import "./Gallery.css";
function Gallery() {

const images=[
"/uploads/gallery/1.jpg",
"/uploads/gallery/2.jpg",
"/uploads/gallery/3.jpg",
"/uploads/gallery/4.jpg",
"/uploads/gallery/5.jpg",
"/uploads/gallery/6.jpg"
];

return(

<main className="gallery-page">

<section className="gallery-hero gallery-video-hero">
<video
  className="gallery-background-video"
  autoPlay
  muted
  loop
  playsInline
  poster="/hero.jpg"
  aria-hidden="true"
>
  <source
    src={import.meta.env.VITE_GALLERY_VIDEO_URL || "/videos/benevolent-community-loop.mp4"}
    type="video/mp4"
  />
</video>
<div className="gallery-video-overlay" />

<div className="section-container">

<span className="page-badge">
COMMUNITY GALLERY
</span>

<h1>
Our Journey Together
</h1>

<p>
Moments of unity, compassion,
leadership and support shared
through Benevolent Midax.
</p>

</div>

</section>

<section className="gallery-grid">

<div className="section-container">

{images.map((img,index)=>(

<div
className="gallery-card"
key={index}
>

<img
src={img}
alt="Benevolent Midax community moment"
onError={(e)=>{e.currentTarget.src="/gallery-placeholder.svg";}}
/>

</div>

))}

</div>

</section>

</main>

);

}

export default Gallery;