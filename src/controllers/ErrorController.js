class WebError extends Error{
    constructor(name, message, status=500){
        super(message);
        this.name = name;
        this.status = status;
    }
}

exports.WebError = WebError;
exports.errorHandler = function(err, req, res, next){
    res.status(err.status);
    res.render('error', {name: err.name ?? null, message: err.message ?? null});
}