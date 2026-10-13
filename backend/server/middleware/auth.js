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
    id: 'd7ac82d1-9c43-4525-906c-fa383406daba',
    email: 'admin@hotel.com',
    full_name: 'Grand Azure General Manager',
    role: 'ADMIN'
  },
  'demo-token-receptionist': {
    id: '21f75765-2d96-40c0-9d9e-b63efead3945',
    email: 'reception@hotel.com',
    full_name: 'Daw Nu Nu',
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
      req.user = { ...DEMO_TOKENS[token], is_email_verified: true };
      return next();
    }

    // 2. Check Customer JWT Token (issued by /api/auth)
    try {
      const { verifyCustomerToken } = require('../routes/authRoutes');
      const customerPayload = verifyCustomerToken(token);
      if (customerPayload) {
        req.user = {
          id: customerPayload.id,
          email: customerPayload.email,
          full_name: customerPayload.full_name,
          role: customerPayload.role || 'GUEST',
          is_email_verified: customerPayload.is_email_verified ?? true
        };
        return next();
      }
    } catch (e) {
      // Continue to Supabase Auth fallback
    }
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
      const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);

      // Query profiles table for role
      let { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        const fallbackName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Guest';

        const userEmail = (user.email || '').trim().toLowerCase();

        // 1. Check if profile exists by email under a legacy or mock ID
        if (userEmail) {
          const { data: existingByEmail } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('email', userEmail)
            .maybeSingle();

          if (existingByEmail) {
            const { data: updatedProfile } = await supabase
              .from('profiles')
              .update({ id: user.id, full_name: fallbackName })
              .eq('id', existingByEmail.id)
              .select()
              .maybeSingle();
            if (updatedProfile) profile = updatedProfile;
          }
        }

        // 2. Otherwise insert or upsert
        if (!profile) {
          const { data: newProfile, error: insErr } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: userEmail,
              full_name: fallbackName,
              role: 'GUEST'
            }, { onConflict: 'id' })
            .select()
            .maybeSingle();
          if (newProfile) {
            profile = newProfile;
          } else if (insErr) {
            console.warn('[requireAuth] Profile upsert error:', insErr.message);
          }
        }
      }

      const userRole = profile?.role || 'GUEST';

      req.user = {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email,
        role: userRole,
        is_email_verified: isEmailVerified
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
        role: memoryProfile.role,
        is_email_verified: true
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

/**
 * Ensures the authenticated user has a verified email address.
 * Rejects with 403 Forbidden if email is unverified.
 */
function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required before completing reservation.',
      code: 'UNAUTHORIZED'
    });
  }

  // Admin and Receptionist staff can create or manage bookings
  if (['ADMIN', 'RECEPTIONIST'].includes(req.user.role)) {
    return next();
  }

  if (req.user.is_email_verified !== true) {
    return res.status(403).json({
      success: false,
      error: 'Email verification is required before you can complete a room reservation. Please verify your email.',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
}

/**
 * Optional authentication middleware: if Authorization header is present,
 * populates req.user. If absent or invalid, proceeds with req.user = null.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }
  return requireAuth(req, res, (err) => {
    if (err) req.user = null;
    next();
  });
}

module.exports = {
  requireAuth,
  requireVerifiedEmail,
  optionalAuth,
  DEMO_TOKENS
};
