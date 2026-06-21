const fetchImage = (name) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (name == 'error') reject(-1)
            resolve({name, data: 'raw_data'})
        }, 1000)
    })
}

const resizeImage = (image) => {
    return new Promise(resolve => setTimeout(resolve({...image, data: image.data + '_resized'}), 1000))
}

const applyFilter = (image) => {
    return new Promise((resolve, reject) => {
            return setTimeout(() => {
                if (Math.random() < 0.3) reject(image)
                resolve({...image, data: image.data + '_filtered'})
            }, 1000)
        })
}

const saveImage = (image) => {
    console.log(`Saved: [${image.name}] ([${image.data}])`)
}

fetchImage('aaa')
    .then(img => resizeImage(img))
    .then(img => applyFilter(img))
    .catch(err => err)
    .then(img => saveImage(img))

