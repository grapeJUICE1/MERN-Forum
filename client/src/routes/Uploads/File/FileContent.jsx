import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import Lightbox from 'react-image-lightbox';
import { toast } from 'react-toastify';

import { counter, declOfNum, dateFormat, formatBytes } from 'support/Utils';
import { BACKEND, Strings } from 'support/Constants';

import Markdown from 'components/Markdown';
import Dropdown from 'components/Card/Dropdown';
import { Button } from 'components/Button';

const FileContent = ({ data, user, token, lang, deleteFile, editFile }) => {
  const history = useHistory()
  const likesList = useRef()
  const [likes, setLikes] = useState(data.likes)
  const [liked, setLiked] = useState(user ? !!data?.likes?.find(i => i._id === user.id) : false)
  const [image, setImage] = useState('')
  const [imageOpen, setImageOpen] = useState(false)
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif']
  const regexp = /(?:\.([^.]+))?$/

  const imageView = (url) => {
    setImage(url)
    setImageOpen(true)
  }

  useEffect(() => {
    if (imageOpen) {
      document.body.classList.add('noscroll')
    } else {
      document.body.classList.remove('noscroll')
    }
  }, [imageOpen])

  useEffect(() => {
    setLikes(data.likes)
  }, [data.likes])

  const likeFile = () => {
    fetch(BACKEND + '/api/file/like', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileId: data._id })
    })
      .then(response => response.json())
      .then(data => {
        if (!data.error) {
          setLikes(data.likes)
        } else throw Error(data.error?.message || 'Error')
      })
      .catch(err => toast.error(err.message))
  }

  const onLike = ({ target }) => {
    if (likesList.current?.contains(target)) return

    if (user) {
      setLiked(prev => !prev)
      likeFile()
    } else {
      history.push('/signup')
    }
  }

  const onDownload = () => {
    fetch(BACKEND + '/api/file/download', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileId: data._id })
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) throw Error(data.error?.message || 'Error')
      })
      .catch(console.error)

    const win = window.open(BACKEND + data.file.url, '_blank')
    win.focus()
  }

  const copyLink = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(Strings.linkCopied[lang]))
      .catch(err => toast.error(Strings.failedToCopyLink[lang]))
  }

  return (
    <Fragment>
      <div className="card_item file_card">
        <div className="card_body">
          <div className="card_block">
            <header className="card_head column">
              {imageTypes.find(i => i === data.file.type) && (
                <img
                  className="card_left"
                  src={BACKEND + data.file.url}
                  onClick={() => imageView(BACKEND + data.file.url)}
                />
              )}

              <div className="card_head_inner">
                <div className="card_title full">{data.title}</div>

                <div className="card_info">
                  <Link to={'/user/' + data.author.name} className="head_text bold">
                    {data.author.displayName}
                    {data.author.role === 'admin' && <span className="user_status">admin</span>}
                  </Link>
                  <span className="bullet">•</span>
                  <span className="head_text">
                    <time>{dateFormat(data.createdAt)}</time>
                  </span>
                </div>
              </div>

              {user && (
                <Dropdown>
                  <div onClick={() => copyLink(BACKEND + data.file.url)} className="dropdown_item">
                    {Strings.copyFileLink[lang]}
                  </div>
                  {user.role === 'admin' && (
                    <div onClick={() => deleteFile()} className="dropdown_item">{Strings.delete[lang]}</div>
                  )}
                  {user.id === data.author._id || user.role === 'admin' ? (
                    <div onClick={() => editFile()} className="dropdown_item">{Strings.edit[lang]}</div>
                  ) : null}
                </Dropdown>
              )}
            </header>

            <div className="card_content markdown">
              <Markdown
                source={data.body}
                onImageClick={imageView}
              />
            </div>

            <div className="card_content">
              <div>
                <span className="secondary_text">{Strings.extension[lang]}:</span>
                {regexp.exec(data.file.url)[1]}
              </div>
              <div>
                <span className="secondary_text">{Strings.fileSize[lang]}:</span>
                {formatBytes(data.file.size)}
              </div>
            </div>

            <footer className="card_foot">
              <div className="act_btn foot_btn disable">
                <i className="bx bx-download" />
                <span className="card_count">{counter(data.downloads)}</span>
                <span className="hidden">
                  {declOfNum(data.downloads, [Strings.download1[lang], Strings.download2[lang], Strings.download3[lang]])}
                </span>
              </div>

              <div className="act_btn foot_btn likes" onClick={onLike}>
                <i className={liked ? 'bx bx-heart liked' : 'bx bx-heart'} />
                {likes.length ? (
                  <Fragment>
                    <span className="card_count">{counter(likes.length)}</span>
                    <span className="hidden">
                      {declOfNum(likes.length, [Strings.like1[lang], Strings.like2[lang], Strings.like3[lang]])}
                    </span>
                    {user && (
                      <div className="likes_list" ref={likesList}>
                        {likes.slice(0, 4).map((item, index) => (
                          <Link
                            key={index}
                            to={'/user/' + item.name}
                            className="head_profile"
                            title={item.displayName}
                            style={{ backgroundImage: `url(${item.picture ? BACKEND + item.picture : ''})` }}
                          >
                            {!item.picture && item.displayName.charAt(0)}
                          </Link>
                        ))}
                        {likes.length > 4 && <span>and {likes.length - 4} more</span>}
                      </div>
                    )}
                  </Fragment>
                ) : null}
              </div>
            </footer>
          </div>
        </div>
      </div>

      <div className="card_item center">
        <Button
          className="main hollow"
          text={Strings.download[lang]}
          onClick={onDownload}
        />
      </div>

      {imageOpen && (
        <Lightbox
          mainSrc={image}
          onCloseRequest={() => setImageOpen(false)}
        />
      )}
    </Fragment>
  )
}

export default FileContent;
