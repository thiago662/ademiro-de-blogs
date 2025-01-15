import { Component } from '@angular/core';
import { ListService } from './list.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent {
  urlBlog = environment.urlBlog;
  lists: any;
  postForm = new FormGroup({
    title: new FormControl(''),
    active: new FormControl(false),
    created_by: new FormControl(''),
    created_at: new FormControl(new Date().toISOString()),
    updated_at: new FormControl(new Date().toISOString()),
  });

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private listService: ListService,
  ) { }

  ngOnInit(): void {
    this.getPost();
  }

  getPost() {
    this.listService.getPosts()
      .then((data: any) => {
        var resultArray = Object.keys(data).map(function(personNamedIndex){
          let person = data[personNamedIndex];
          person.id = personNamedIndex;

          return person;
        });

        this.lists = resultArray;
      })
      .catch((error: any) => {
        console.log(error);
      })
      .finally(() => {
      });
  }

  onSubmitToCreate() {
    this.createPost(this.postForm.value);
  }

  createPost(post: any): void {
    this.listService.createPost(post)
      .then((data: any) => {
        this.router.navigate(['/' + data?.name]);
      })
      .catch((error: any) => {
        console.log(error);
      })
      .finally(() => {});
  }

  getDateDiff(list: any) {
    var date1 = new Date(list.created_at);
    var date2 = new Date();

    var diff = Math.abs(date1.getTime() - date2.getTime());
    var diffDays = Math.ceil(diff / (1000 * 3600 * 24));

    return diffDays;
  }
}
