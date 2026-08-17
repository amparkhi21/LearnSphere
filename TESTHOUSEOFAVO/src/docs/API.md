# API Documentation

Base URL: `http://localhost:5000/api/v1`

Auth: Send `Authorization: Bearer <token>` header (token returned from register/login), or rely on the `token` httpOnly cookie set automatically on register/login.

---

## Auth (`/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register (body: name, email, password, role, stream, examTarget) |
| POST | `/auth/login` | Public | Login (body: email, password) |
| POST | `/auth/logout` | Public | Clear auth cookie |
| GET | `/auth/me` | Private | Get current logged-in user |

## Users (`/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| PATCH | `/users/me` | Private | Update own profile |
| GET | `/users/:id` | Public | Get a user's public profile |
| GET | `/users` | Admin | List all users (filter by role) |
| PATCH | `/users/:id/ban` | Admin | Toggle ban status |

## Courses (`/courses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/courses` | Public | List/search/filter published courses (q, stream, subject, examTag, level, minPrice, maxPrice, page, limit) |
| GET | `/courses/:idOrSlug` | Public | Get single course |
| GET | `/courses/teacher/mine` | Teacher | Get own courses (any status) |
| POST | `/courses` | Teacher | Create a course |
| PATCH | `/courses/:id` | Teacher (owner) | Update a course |
| DELETE | `/courses/:id` | Teacher (owner) | Delete a course |

## Enrollments (`/enrollments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/enrollments` | Private | Enroll in a course (body: courseId, paymentId if paid) |
| GET | `/enrollments/mine` | Private | Get own enrollments |
| PATCH | `/enrollments/:id/progress` | Private | Update progress / mark module complete |
| POST | `/enrollments/:id/review` | Private | Submit rating & review |

## Resources (`/resources`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/resources` | Public | List/search resources |
| GET | `/resources/:id` | Public | Get single resource (increments view count) |
| POST | `/resources/:id/download` | Public | Track a download |
| POST | `/resources` | Private | Upload a resource (`multipart/form-data`, field `file`) |
| DELETE | `/resources/:id` | Private (owner) | Delete a resource |

## Communities (`/communities`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/communities` | Public | List communities |
| GET | `/communities/:slug` | Public | Get community by slug |
| POST | `/communities` | Private | Create a community |
| POST | `/communities/:id/join` | Private | Join a community |
| POST | `/communities/:id/leave` | Private | Leave a community |

## Posts (`/posts`) & Comments (`/comments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/posts?community=:id` | Public | List posts (filter by community, isDoubt, isResolved, q) |
| GET | `/posts/:id` | Public | Get single post |
| POST | `/posts` | Private | Create post (body: community, title, content, isDoubt, tags) |
| POST | `/posts/:id/vote` | Private | Upvote/downvote (body: direction "up"/"down") |
| PATCH | `/posts/:id/resolve` | Private (author) | Mark doubt resolved |
| DELETE | `/posts/:id` | Private (owner) | Delete post |
| GET | `/comments?post=:id` | Public | List comments for a post |
| POST | `/comments` | Private | Add comment (body: post, content, parentComment) |
| POST | `/comments/:id/upvote` | Private | Toggle upvote |
| DELETE | `/comments/:id` | Private (owner) | Delete comment |

## Quizzes (`/quizzes`) & Attempts (`/quiz-attempts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/quizzes` | Public | List quizzes (answers hidden) |
| GET | `/quizzes/:id` | Public | Get quiz (answers hidden) |
| POST | `/quizzes` | Teacher | Manually create a quiz |
| POST | `/quizzes/generate` | Private | **AI-generate** a quiz (body: subject, topic, difficulty, count) |
| POST | `/quiz-attempts` | Private | Submit answers, get graded result + explanations |
| GET | `/quiz-attempts/mine` | Private | Get own attempt history |
| GET | `/quiz-attempts/:id` | Private (owner) | Get single attempt detail |

## Study Plans (`/study-plans`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/study-plans/generate` | Private | **AI-generate** syllabus + weekly plan (body: examTarget, stream, subjects[], durationWeeks, hoursPerDay) |
| GET | `/study-plans/mine` | Private | List own study plans |
| GET | `/study-plans/:id` | Private (owner) | Get single plan |
| PATCH | `/study-plans/:id/progress` | Private (owner) | Update progress % |
| DELETE | `/study-plans/:id` | Private (owner) | Delete plan |

## Bookmarks (`/bookmarks`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/bookmarks` | Private | Bookmark an item (body: itemType, itemId) |
| GET | `/bookmarks?itemType=course` | Private | List own bookmarks |
| DELETE | `/bookmarks/:id` | Private (owner) | Remove bookmark |

## Notifications (`/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/notifications` | Private | List own notifications + unread count |
| PATCH | `/notifications/:id/read` | Private | Mark one as read |
| PATCH | `/notifications/read-all` | Private | Mark all as read |

## Payments (`/payments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/payments/create-order` | Private | Create a Razorpay (or mock) order for a paid course |
| POST | `/payments/verify` | Private | Verify payment signature, mark as success |
| GET | `/payments/mine` | Private | List own payment history |

## AI (`/ai`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/ai/status` | Public | Check if a real AI provider key is configured |
| POST | `/ai/recommend-resources` | Private | Get AI resource suggestions (body: subject, examTarget, recentTopics) |
| POST | `/ai/course-outline` | Private | Get AI-generated course module outline (body: title, subject, level) |
| POST | `/ai/doubt-assist` | Private | Get an AI-drafted answer to a student doubt (body: question, subject) |

---

### Notes
- All list endpoints support pagination via `page` & `limit` query params where applicable.
- Without `GEMINI_API_KEY` or `GROQ_API_KEY` set, all AI endpoints still work — they return sensible template-based fallback content so the app is fully demoable with zero cost.
- Without Cloudinary keys, uploaded files are stored locally in `src/uploads` and served via `/uploads/<filename>`.
- Without Razorpay keys, payments run in "mock" mode and are auto-verified.
