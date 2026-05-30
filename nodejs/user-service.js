class UserService {
    #profiles = {};
    #posts = {};
    
    async #getProfile(id) {
        return await new Promise((resolve, reject) => setTimeout(() => {
            const profile = this.#profiles[id];
            if (!profile) reject(null);
            resolve({id, ...profile});
        }, 1000))
    }

    async #getPosts(id) {
        return await new Promise((resolve, reject) => setTimeout(() => {
            const posts = this.#posts[id];
            if (!posts) reject([])
            resolve(posts)
        }, 1000));
    }

    async getDashboardData(id) {
        const profPosts = await Promise.all([
            this.#getProfile(id).catch(e => e),
            this.#getPosts(id).catch(e => e),
        ]);
        return {profile: profPosts[0], posts: profPosts[1]};
    }

    addPost(id, content) {
        if (!this.#profiles[id]) throw new Error(`id: ${id}のプロファイルが見つかりません`);
        this.#posts[id] ||= [];
        this.#posts[id].push(content);
    }

    addProfile(id, name, email) {
        this.#profiles[id] = {name, email};
    }
}

const us = new UserService();
us.addProfile(1, 'name1', 'name1.sample.com');
us.addPost(1, 'test1-1');
us.addPost(1, 'test1-2');

us.addProfile(2, 'name2', 'name2.sample.com');

us.getDashboardData(1).then(res => console.log(res)).catch(err => console.log(err))
us.getDashboardData(2).then(res => console.log(res)).catch(err => console.log(err))

try {
    us.addPost(3, 'test3-1');
} catch (e) {
    console.log('エラー発生', e.message)
}
