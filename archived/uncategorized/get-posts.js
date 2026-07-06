const PROFILES = [
    {id: 1, name: 'user1', email: 'user1@example.com'},
    {id: 2, name: 'user2', email: 'user2@example.com'},
    {id: 3, name: 'user3', email: 'user3@example.com'},
]
const POSTS = [
    {
        id: 1,
        posts: [
            "aaa",
            "bbb"
        ]
    },
    {
        id: 2,
        posts: [
            "ccc",
            "ddd",
        ]
    },
]
const getUserProfile = async (id) => {
    await new Promise(resolve => setTimeout(() => resolve(), 1000))
    const profile = PROFILES.find(p => p.id == id)
    if (!profile) throw new Error(id)
    return profile
}
const getUserPosts = async (id) => {
    await new Promise(resolve => setTimeout(() => resolve(), 1000));
    const post_entries = POSTS.find(p => p.id == id)
    return post_entries ? post_entries.posts : []
}

const getUserDashboardData = (id) => {
    return Promise.all([
        getUserProfile(id).catch(() => null),
        getUserPosts(id).catch(() => []),
    ]).then(db => {
        return {profile: db[0], posts: db[1]}
    })
}

getUserDashboardData(1).then(r => console.log(r))
getUserDashboardData(2).then(r => console.log(r))
getUserDashboardData(3).then(r => console.log(r))
getUserDashboardData(4).then(r => console.log(r))
