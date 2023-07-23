document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('search');
  
    searchInput.addEventListener('keyup', function (event) {
      let searchQuery = event.target.value;
  
      fetch(`http://www.omdbapi.com/?apikey=6f140aea&s=${searchQuery}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.Search && Array.isArray(data.Search)) {
        let movies = data.Search;
        let output = '<div class="row">';  // Open a new row
        for (let i = 0; i < movies.length; i++) {
          let movie = movies[i];
          output += `
            <div class="col-lg-3 col-md-4 col-sm-6">  <!-- Bootstrap classes to create 4 cards per row on large screens, 3 on medium, 2 on small -->
                <div class="card mb-4">  <!-- The 'mb-4' class adds some margin to the bottom of each card -->
                    <img src="${movie.Poster}" class="card-img-top img-fluid" alt="${movie.Title}">  <!-- 'img-fluid' class makes the image responsive -->
                    <div class="card-body">
                        <h5 class="card-title">${movie.Title}</h5>
                        <p class="card-text">${movie.Year}</p>
                        <button class="btn btn-primary favorite-btn" data-movie-id="${movie.imdbID}">Favorite</button>  <!-- Favorite button with the movie ID stored in a data attribute -->
                    </div>
                </div>
            </div>
          `;
          if ((i + 1) % 4 === 0) {  // Every 4 movies, close the row and start a new one
            output += '</div><div class="row">';
          }
        }
        output += '</div>';  // Close the last row
        document.getElementById('movie-results').innerHTML = output;

        document.querySelectorAll('.favorite-btn').forEach(button => {
          button.addEventListener('click', function() {
              const movieId = this.getAttribute('data-movie-id');
      
              fetch('/favorites', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      movieId: movieId
                  })
              }).then(response => {
                  if (response.ok) {
                      alert('Movie added to favorites!');
                  } else {
                      alert('Failed to add movie to favorites.');
                  }
              });
          });
      });      
      } else {
        console.log('No movie data received');
      }
    });

    });
  });
  