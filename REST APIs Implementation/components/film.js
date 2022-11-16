class Film{    
    constructor(id, title, owner, privateFilm, watchDate, rating, favorite) {
        if(id)
            this.id = id;

        this.title = title;
        this.owner = owner;
        this.private = privateFilm;

        if(watchDate)
            this.watchDate = watchDate;
        if(rating)
            this.rating = rating;
        if(favorite)
            this.favorite = favorite;
        
        var selfLink = (privateFilm? "/api/films/private/" + this.id : "/api/films/public/" + this.id);
        this.self =  selfLink;
    }
}

module.exports = Film;


