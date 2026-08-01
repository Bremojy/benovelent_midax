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

<section className="gallery-hero">

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
alt="gallery"
/>

</div>

))}

</div>

</section>

</main>

);

}

export default Gallery;