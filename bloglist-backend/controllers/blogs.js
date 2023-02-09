const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

blogsRouter.get("/", async (req, response) => {
  const blogs = await Blog.find({}).populate("user", { username: 1, name: 1 });
  response.json(blogs);
});

blogsRouter.get("/:id", async (req, response, next) => {
  const blog = await Blog.findById(req.params.id);
  if (blog) {
    response.json(blog);
  } else {
    response.status(404).end();
  }
});

blogsRouter.post("/", async (request, response, next) => {
  const body = request.body;
  const decodedToken = jwt.verify(request.token, process.env.SECRET);

  if (!request.token || !decodedToken.id) {
    return response.status(402).json({ error: "token missing or invalid" });
  }

  const user = await User.findById(decodedToken.id);

  const blog = new Blog({
    author: body.author,
    title: body.title,
    url: body.url,
    likes: body.likes,
    user: user._id,
  });

  const savedBlog = await blog.save();
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  response.json(savedBlog);
});

blogsRouter.put("/:id", async (request, response, next) => {
  const body = request.body;
  const decodedToken = await jwt.verify(request.token, process.env.SECRET);
  
  
  if (!request.token || !decodedToken.id) {
    return response.status(402).json({ error: "token missing or invalid" });
  }

  const blogToUpdate = await Blog.findById(request.params.id);
  const user = await User.findById(decodedToken.id);

  if (user.id !== blogToUpdate.user._id.toString()) {
    return response.status(401).json({
      error: "You can not edit a blog you do not own",
    });
  }

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
  };

  try {
    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, {
      new: true,
    });
    response.json(updatedBlog);
  } catch (exception) {
    next(exception);
  }
});

blogsRouter.delete("/:id", async (request, response, next) => {
  const decodedToken = jwt.verify(request.token, process.env.SECRET);

  const blog = await Blog.findById(request.params.id);

  if (!blog) {
    return response.status(400).json({
      error: "The blog you are trying to delete does not exists",
    });
  }

  if (!request.token || decodedToken.id !== blog.user._id.toString()) {
    return response.status(401).json({
      error: "You can not delete a blog you do not own",
    });
  }

  await Blog.findByIdAndDelete(request.params.id);
  response.status(204).end();
});

module.exports = blogsRouter;
