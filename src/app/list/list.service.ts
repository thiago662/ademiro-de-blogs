import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ListService {

  constructor(
    private http: HttpClient,
  ) { }

  getPosts() {
    if (environment.production) {
      return this.http.get(environment.urlApi + '/' + environment.nameBlog + '.json', {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      }).toPromise();
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = sessionStorage.getItem(environment.nameBlog);
        const lists = data ? JSON.parse(data) : [];
        resolve(lists);
      }, Math.random() * 1000);
    });
  }

  createPost(post: any) {
    if (environment.production) {
      return this.http.post(environment.urlApi + '/' + environment.nameBlog + '.json', post, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      }).toPromise();
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        post.id = Math.random().toString(36).substring(2, 15);
        const data = sessionStorage.getItem(environment.nameBlog);
        const lists = data ? JSON.parse(data) : [];
        lists[post.id] = post;
        sessionStorage.setItem(environment.nameBlog, JSON.stringify(lists));
        post.name = post.id;
        resolve(post);
      }, Math.random() * 1000);
    });
  }
}
