import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DetailService {

  constructor(
    private http: HttpClient,
  ) { }

  getPost(id: any) {
    if (environment.production) {
      return this.http.get(environment.urlApi + '/' + environment.nameBlog + '/' + id + '.json', {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      }).toPromise();
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = sessionStorage.getItem(environment.nameBlog);
        const posts = data ? JSON.parse(data) : [];
        const post = posts[id];
        resolve(post);
      }, Math.random() * 1000);
    });
  }

  savePost(id: any, post: any) {
    if (environment.production) {
      return this.http.put(environment.urlApi + '/' + environment.nameBlog + '/' + id + '.json', post, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      }).toPromise();
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = sessionStorage.getItem(environment.nameBlog);
        const posts = data ? JSON.parse(data) : [];
        posts[id] = post;
        sessionStorage.setItem(environment.nameBlog, JSON.stringify(posts));
        resolve(post);
      }, Math.random() * 1000);
    });
  }

  deletePost(id: any) {
    if (environment.production) {
      return this.http.delete(environment.urlApi + '/' + environment.nameBlog + '/' + id + '.json', {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      }).toPromise();
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = sessionStorage.getItem(environment.nameBlog);
        const posts = data ? JSON.parse(data) : [];
        delete posts[id];
        sessionStorage.setItem(environment.nameBlog, JSON.stringify(posts));
        resolve([]);
      }, Math.random() * 1000);
    });
  }
}
