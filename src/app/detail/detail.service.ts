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
    return this.http.get(environment.urlApi + '/' + environment.nameBlog + '/' + id + '.json', {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    }).toPromise();
  }

  savePost(id: any, post: any) {
    return this.http.put(environment.urlApi + '/' + environment.nameBlog + '/' + id + '.json', post, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    }).toPromise();
  }

  deletePost(id: any) {
    return this.http.delete(environment.urlApi + '/' + environment.nameBlog + '/' + id + '.json', {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    }).toPromise();
  }
}
