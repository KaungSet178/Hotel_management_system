/**
 * Authentication Middleware for Supabase Auth
 * 
 * 1. Extracts Bearer token from the incoming Authorization header.
 * 2. Validates token via supabase.auth.getUser(token) (or local profile registry).
 * 3. Fetches user's role from public.profiles table.
 * 4. Injects req.user = { id, email, full_name, role }.
 * 5. Returns 401 Unauthorized for missing or invalid tokens.
 */

const { supabase, isConfigured, memoryStore } = require('../supabaseClient');

// Static / Development test token registry
const DEMO_TOKENS = {
  'demo-token-admin': {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@hotel.com',
    full_name: 'Grand Azure Admin',
    role: 'ADMIN'
  },
  'demo-token-receptionist': {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'reception@hotel.com',
    full_name: 'Clara Vance',
    role: 'RECEPTIONIST'
  },
  'demo-token-housekeeping': {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'housekeeping@hotel.com',
    full_name: 'Mateo Silva',
    role: 'HOUSEKEEPING'
  },
  'demo-token-guest': {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'elena.rostova@example.com',
    full_name: 'Elena Rostova',
    role: 'GUEST'
  },
  'demo-token-guest-2': {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'marcus.vance@example.com',
    full_name: 'Marcus Vance',
    role: 'GUEST'
  }
};

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing Authorization header.',
        code: 'UNAUTHORIZED'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authorization header format must be "Bearer <token>".',
        code: 'UNAUTHORIZED'
      });
    }

    const token = parts[1].trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Empty token provided.',
        code: 'UNAUTHORIZED'
      });
    }

    // 1. Check local/test token registry
    if (DEMO_TOKENS[token]) {
      req.user = { ...DEMO_TOKENS[token] };
      return next();
    }

    // 2. Validate via Supabase Auth when configured
    if (isConfigured && supabase) {
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);

      if (authErr || !authData?.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid or expired Supabase token.',
          code: 'UNAUTHORIZED'
        });
      }

      const user = authData.user;

      // Query profiles table for role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      const userRole = profile?.role || 'GUEST';

      req.user = {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email,
        role: userRole
      };

      return next();
    }

    // 3. Fallback check for simulated tokens or registered memoryStore profiles
    const memoryProfile = memoryStore.profiles?.find(p => p.id === token || p.email === token);
    if (memoryProfile) {
      req.user = {
        id: memoryProfile.id,
        email: memoryProfile.email,
        full_name: memoryProfile.full_name,
        role: memoryProfile.role
      };
      return next();
    }

    // Token could not be authenticated
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired token.',
      code: 'UNAUTHORIZED'
    });

  } catch (err) {
    console.error('Auth Middleware Exception:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Authentication Error.',
      code: 'AUTH_SERVER_ERROR'
    });
  }
}

module.exports = {
  requireAuth,
  DEMO_TOKENS
};
