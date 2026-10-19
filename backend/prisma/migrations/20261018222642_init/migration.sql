-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "type" VARCHAR(20) NOT NULL,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_areas" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "focus_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "looking_for_options" (
    "id" SERIAL NOT NULL,
    "label" VARCHAR(50) NOT NULL,

    CONSTRAINT "looking_for_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(30) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "github_id" VARCHAR(50),
    "github_username" VARCHAR(50),
    "github_url" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "banner_url" VARCHAR(500),
    "bio_markdown" TEXT,
    "professional_title" VARCHAR(100),
    "role_id" INTEGER,
    "focus_id" INTEGER,
    "certificates" JSONB,
    "social_links" JSONB,
    "is_student" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_technologies" (
    "user_id" UUID NOT NULL,
    "technology_id" INTEGER NOT NULL,

    CONSTRAINT "user_technologies_pkey" PRIMARY KEY ("user_id","technology_id")
);

-- CreateTable
CREATE TABLE "user_looking_for" (
    "user_id" UUID NOT NULL,
    "looking_for_id" INTEGER NOT NULL,

    CONSTRAINT "user_looking_for_pkey" PRIMARY KEY ("user_id","looking_for_id")
);

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "followed_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","followed_id")
);

-- CreateTable
CREATE TABLE "discover_actions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "action" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discover_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_attachments" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "order_index" SMALLINT NOT NULL,
    "image_url" VARCHAR(500),
    "code_content" TEXT,
    "code_language" VARCHAR(30),

    CONSTRAINT "post_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "post_id" BIGINT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "reposts" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reposts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_comment_id" BIGINT,
    "content" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_likes" (
    "comment_id" BIGINT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("comment_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_technologies_name_type" ON "technologies"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_focus_areas_name" ON "focus_areas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_username" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_github_id" ON "users"("github_id");

-- CreateIndex
CREATE INDEX "idx_users_role_id" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "idx_users_focus_id" ON "users"("focus_id");

-- CreateIndex
CREATE INDEX "idx_user_technologies_tech" ON "user_technologies"("technology_id");

-- CreateIndex
CREATE INDEX "idx_follows_followed_id" ON "follows"("followed_id");

-- CreateIndex
CREATE INDEX "idx_discover_actions_user" ON "discover_actions"("user_id");

-- CreateIndex
CREATE INDEX "idx_discover_actions_target" ON "discover_actions"("target_user_id");

-- CreateIndex
CREATE INDEX "idx_posts_user_id" ON "posts"("user_id");

-- CreateIndex
CREATE INDEX "idx_post_attachments_post_id" ON "post_attachments"("post_id", "order_index");

-- CreateIndex
CREATE INDEX "idx_post_likes_user_id" ON "post_likes"("user_id");

-- CreateIndex
CREATE INDEX "idx_reposts_post_id" ON "reposts"("post_id");

-- CreateIndex
CREATE INDEX "idx_reposts_user_id" ON "reposts"("user_id");

-- CreateIndex
CREATE INDEX "idx_comments_post_id" ON "comments"("post_id");

-- CreateIndex
CREATE INDEX "idx_comments_user_id" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "idx_comments_parent_id" ON "comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "idx_comment_likes_user_id" ON "comment_likes"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_focus_id_fkey" FOREIGN KEY ("focus_id") REFERENCES "focus_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_technologies" ADD CONSTRAINT "user_technologies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_technologies" ADD CONSTRAINT "user_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_looking_for" ADD CONSTRAINT "user_looking_for_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_looking_for" ADD CONSTRAINT "user_looking_for_looking_for_id_fkey" FOREIGN KEY ("looking_for_id") REFERENCES "looking_for_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discover_actions" ADD CONSTRAINT "discover_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discover_actions" ADD CONSTRAINT "discover_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
