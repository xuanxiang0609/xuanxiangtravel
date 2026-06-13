
fetch('/reviews/reviews.json')

.then(r=>r.json())

.then(data=>{

let html='';

data.forEach(item=>{

html+=`

<div class="review-card">

<h2>⭐⭐⭐⭐⭐ ${item.customer}</h2>

<p>${item.route}</p>

<p>${item.people}</p>

<p>${item.vehicle}</p>

<a href="review-detail.html?id=${item.id}">
查看完整案例
</a>

</div>

`;

});

document.getElementById('reviewsList').innerHTML=html;

});

