import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'Please provide name, email, and password.', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters.', 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 'An account with that email already exists.', 400);
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    const token = user.generateAuthToken();

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          apiKeyPreferences: user.apiKeyPreferences,
        },
      },
      'User registered successfully.',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Please provide both email and password.', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid credentials. User not found.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials. Incorrect password.', 401);
    }

    const token = user.generateAuthToken();

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        apiKeyPreferences: user.apiKeyPreferences,
      },
    }, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    return sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        apiKeyPreferences: user.apiKeyPreferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const { llmProvider, llmApiKey, llmModel, embeddingApiKey } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    user.apiKeyPreferences = {
      llmProvider: llmProvider !== undefined ? llmProvider : user.apiKeyPreferences?.llmProvider,
      llmApiKey: llmApiKey !== undefined ? llmApiKey : user.apiKeyPreferences?.llmApiKey,
      llmModel: llmModel !== undefined ? llmModel : user.apiKeyPreferences?.llmModel,
      embeddingApiKey: embeddingApiKey !== undefined ? embeddingApiKey : user.apiKeyPreferences?.embeddingApiKey,
    };

    await user.save();

    return sendSuccess(res, {
      apiKeyPreferences: user.apiKeyPreferences,
    }, 'API preferences updated successfully.');
  } catch (error) {
    next(error);
  }
};
