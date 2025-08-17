export const catchAsyncError = (theFunction) => {
  return (req, res, next) => {
    Promise.resolve(theFunction(req, res, next)).catch(next);
  };
};
// This middleware is used to catch errors in asynchronous functions and pass them to the error handling middleware.
// It wraps the provided function and ensures that any errors thrown within it are caught and passed to
